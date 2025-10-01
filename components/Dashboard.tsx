"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { Upload, Github, CircleCheck as CheckCircle2, Circle as XCircle, Loader as Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
}

type DeployStatus = "idle" | "uploading" | "extracting" | "committing" | "success" | "error";

export default function Dashboard() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState("Deploy files via ZhivLux");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [commitUrl, setCommitUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch("/api/get-repos");
        const data = await res.json();
        if (data.repos) {
          setRepositories(data.repos);
        }
      } catch (error) {
        console.error("Failed to fetch repos:", error);
      }
    };

    if (session) {
      fetchRepos();
    }
  }, [session]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".zip")) {
      setFile(droppedFile);
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith(".zip")) {
      setFile(selectedFile);
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const handleDeploy = async () => {
    if (!file || !selectedRepo) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("repo", selectedRepo);
    formData.append("message", commitMessage);

    setStatus("uploading");
    setProgress(10);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStatus("extracting");
      setProgress(40);

      await new Promise((resolve) => setTimeout(resolve, 500));
      setStatus("committing");
      setProgress(70);

      const res = await fetch("/api/deploy", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setProgress(100);
        setStatus("success");
        setCommitUrl(data.commitUrl);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Deployment failed");
      }
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "An unexpected error occurred");
    }
  };

  const resetForm = () => {
    setFile(null);
    setSelectedRepo("");
    setCommitMessage("Deploy files via ZhivLux");
    setStatus("idle");
    setProgress(0);
    setCommitUrl("");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "uploading":
        return "Uploading file...";
      case "extracting":
        return "Extracting content...";
      case "committing":
        return "Committing to GitHub...";
      case "success":
        return "Deployment Complete!";
      case "error":
        return errorMessage || "Deployment Failed";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">ZhivLux GitDeployer</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10 ring-2 ring-violet-500">
                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-semibold text-white">{session?.user?.name}</p>
                <p className="text-gray-400">@{(session?.user as any)?.username}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl space-y-8">
          {status === "idle" || status === "uploading" || status === "extracting" || status === "committing" ? (
            <>
              <div
                className={`gradient-border transition-all duration-300 ${
                  isDragging ? "scale-105 animate-pulse-glow" : ""
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div
                  className="gradient-border-content p-12 cursor-pointer transition-all duration-300 hover:bg-gray-800/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-semibold text-white mb-2">
                        {file ? file.name : "Drop your ZIP file here"}
                      </h3>
                      <p className="text-gray-400">
                        {file ? "Click to change file" : "or click to browse"}
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {file && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <Label htmlFor="repo" className="text-white text-base">
                      Select Repository
                    </Label>
                    <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                      <SelectTrigger
                        id="repo"
                        className="bg-gray-800 border-gray-700 text-white h-12 text-base"
                      >
                        <SelectValue placeholder="Choose a repository" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 max-h-72">
                        {repositories.map((repo) => (
                          <SelectItem
                            key={repo.id}
                            value={repo.fullName}
                            className="text-white focus:bg-gray-700"
                          >
                            {repo.name} {repo.private && "(Private)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-white text-base">
                      Commit Message
                    </Label>
                    <Input
                      id="message"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white h-12 text-base"
                      placeholder="Enter commit message"
                    />
                  </div>

                  <Button
                    onClick={handleDeploy}
                    disabled={!selectedRepo || status !== "idle"}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-violet-500/50"
                  >
                    {status === "idle" ? (
                      "Extract & Push to GitHub"
                    ) : (
                      <span className="flex items-center space-x-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{getStatusMessage()}</span>
                      </span>
                    )}
                  </Button>

                  {status !== "idle" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Progress value={progress} className="h-2" />
                      <p className="text-center text-gray-400">{getStatusMessage()}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : status === "success" ? (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-success-pop">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Deployment Complete!</h2>
                <p className="text-gray-400 text-lg">
                  Your files have been successfully pushed to GitHub
                </p>
              </div>
              <div className="space-y-4">
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                >
                  <Github className="w-5 h-5" />
                  <span>View Commit on GitHub</span>
                </a>
              </div>
              <Button
                onClick={resetForm}
                variant="outline"
                className="mt-4 border-gray-700 text-white hover:bg-gray-800"
              >
                Deploy Another File
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center animate-success-pop">
                  <XCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Deployment Failed</h2>
                <p className="text-gray-400 text-lg">{errorMessage}</p>
              </div>
              <Button
                onClick={resetForm}
                variant="outline"
                className="mt-4 border-gray-700 text-white hover:bg-gray-800"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

