import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { Octokit } from "@octokit/rest";
import AdmZip from "adm-zip";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session as any).accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const repoFullName = formData.get("repo") as string;
    const commitMessage = formData.get("message") as string;

    if (!file || !repoFullName || !commitMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [owner, repo] = repoFullName.split("/");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const octokit = new Octokit({
      auth: (session as any).accessToken,
    });

    let currentCommitSha: string | undefined;
    let baseTreeSha: string | undefined;

    try {
      // Coba dapatkan referensi branch 'main'
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: "heads/main",
      });
      currentCommitSha = refData.object.sha;
      const { data: currentCommit } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
      });
      baseTreeSha = currentCommit.tree.sha;
    } catch (error: any) {
      // Jika error 404, berarti repo kosong. Kita bisa abaikan.
      if (error.status !== 404) {
        throw error;
      }
    }

    const blobs = await Promise.all(
      zipEntries
        .filter((entry) => !entry.isDirectory)
        .map(async (entry) => {
          const content = entry.getData().toString("base64");
          const { data: blob } = await octokit.git.createBlob({
            owner,
            repo,
            content,
            encoding: "base64",
          });
          return {
            path: entry.entryName,
            mode: "100644" as const,
            type: "blob" as const,
            sha: blob.sha,
          };
        })
    );

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      ...(baseTreeSha ? { base_tree: baseTreeSha } : {}), // Hanya gunakan base_tree jika ada
      tree: blobs,
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      ...(currentCommitSha ? { parents: [currentCommitSha] } : {}), // Hanya gunakan parents jika ada
    });

    // Jika repo kosong, buat ref baru. Jika tidak, update ref yang sudah ada.
    if (currentCommitSha) {
      await octokit.git.updateRef({
        owner,
        repo,
        ref: "heads/main",
        sha: newCommit.sha,
      });
    } else {
      await octokit.git.createRef({
        owner,
        repo,
        ref: "refs/heads/main",
        sha: newCommit.sha,
      });
    }

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`;

    return NextResponse.json({
      success: true,
      commitUrl,
      message: "Deployment complete!",
    });
  } catch (error: any) {
    console.error("Deployment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deploy" },
      { status: 500 }
    );
  }
}
