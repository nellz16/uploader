import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { Octokit } from "@octokit/rest";
import AdmZip from "adm-zip";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const octokit = new Octokit({ auth: (session as any).accessToken });

  try {
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Buat daftar file untuk API
    const filesForTree = zipEntries
      .filter(entry => !entry.isDirectory)
      .map(entry => ({
        path: entry.entryName,
        mode: '100644' as const,
        type: 'blob' as const,
        content: entry.getData().toString('utf8'), // GitHub API akan menangani encoding
      }));
      
    if (filesForTree.length === 0) {
      return NextResponse.json({ error: "ZIP file is empty or contains only directories." }, { status: 400 });
    }

    // Cek apakah branch 'main' ada
    let parentCommitSha: string | null = null;
    try {
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: "heads/main",
      });
      parentCommitSha = refData.object.sha;
    } catch (error: any) {
      // Abaikan error 404/409, ini berarti repo kosong
      if (error.status !== 404 && error.status !== 409) {
        throw error;
      }
    }

    // Buat tree dari daftar file
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      tree: filesForTree,
    });

    // Buat commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.sha,
      // Hanya tambahkan parent jika repo tidak kosong
      parents: parentCommitSha ? [parentCommitSha] : [],
    });

    // Buat atau update branch 'main' untuk menunjuk ke commit baru
    if (parentCommitSha) {
      // Repo sudah ada, update ref
      await octokit.git.updateRef({
        owner,
        repo,
        ref: "heads/main",
        sha: commit.sha,
      });
    } else {
      // Repo kosong, buat ref baru
      await octokit.git.createRef({
        owner,
        repo,
        ref: "refs/heads/main",
        sha: commit.sha,
      });
    }

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${commit.sha}`;

    return NextResponse.json({
      success: true,
      commitUrl,
      message: "Deployment complete!",
    });

  } catch (error: any) {
    console.error("Deployment error:", error);
    const errorMessage = error.response?.data?.message || error.message || "Failed to deploy";
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
}
