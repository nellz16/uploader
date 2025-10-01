"use client";

import { signIn } from "next-auth/react";
import { Github, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <Zap className="w-12 h-12 text-violet-500" />
          <h1 className="text-5xl md:text-6xl font-bold gradient-text">
            ZhivLux GitDeployer
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
          The fastest way to deploy a ZIP to your GitHub repo
        </p>

        <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
          Extract and push your ZIP files directly to GitHub repositories with a single click.
          No command line. No complicated setups. Just simple, instant deployment.
        </p>

        <div className="pt-8">
          <Button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            size="lg"
            className="group relative overflow-hidden bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white px-8 py-6 text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-violet-500/50"
          >
            <span className="flex items-center space-x-3">
              <Github className="w-6 h-6" />
              <span>Login with GitHub</span>
            </span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </Button>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="gradient-border">
            <div className="gradient-border-content p-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
              <p className="text-gray-400 text-sm">
                Deploy your files in seconds with our optimized upload and extraction process
              </p>
            </div>
          </div>

          <div className="gradient-border">
            <div className="gradient-border-content p-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mb-4">
                <Github className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">GitHub Integration</h3>
              <p className="text-gray-400 text-sm">
                Seamlessly connect to your repositories with secure OAuth authentication
              </p>
            </div>
          </div>

          <div className="gradient-border">
            <div className="gradient-border-content p-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Simple & Intuitive</h3>
              <p className="text-gray-400 text-sm">
                Drag, drop, and deploy. No technical knowledge required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
