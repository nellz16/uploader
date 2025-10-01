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

    try {
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: "heads/main",
      });
      currentCommitSha = refData.object.sha;
    } catch (error: any) {
      if (error.status !== 404 && error.status !== 409) {
        throw error;
      }
    }
    
    // **PERUBAHAN UTAMA DI SINI**
    // Buat tree object langsung dari konten file, tanpa membuat blob terlebih dahulu.
    const tree = zipEntries
      .filter((entry) => !entry.isDirectory)
      .map((entry) => {
        return {
          path: entry.entryName,
          mode: "100644" as const,
          type: "blob" as const,
          content: entry.getData().toString("utf8"), // Kirim konten langsung
        };
      });

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      tree,
      // Kita tidak memerlukan base_tree untuk kasus ini
    });

    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      ...(currentCommitSha ? { parents: [currentCommitSha] } : {}),
    });

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
    // Berikan pesan error yang lebih spesifik jika memungkinkan
    const errorMessage = error.response?.data?.message || error.message || "Failed to deploy";
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
}
