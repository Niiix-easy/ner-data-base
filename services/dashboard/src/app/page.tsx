"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";

export default function Home() {
  const { t } = useI18n();
  const [migrationStatus, setMigrationStatus] = useState<{
    loading: boolean;
    message: string;
    type: "success" | "error" | "info" | null;
  }>({
    loading: false,
    message: "",
    type: null,
  });

  const [projectState, setProjectState] = useState<"active" | "paused">("paused");

  const handlePauseResume = async () => {
    const action = projectState === "paused" ? "resume" : "pause";
    setMigrationStatus({ loading: true, message: `${action === "resume" ? "Resuming" : "Pausing"} project...`, type: "info" });
    try {
      const res = await fetch(`/api/control-plane/project/${action}`, { method: "POST" });
      if (res.ok) {
        setProjectState(action === "resume" ? "active" : "paused");
        setMigrationStatus({ loading: false, message: `Project ${action}d successfully.`, type: "success" });
      } else {
        setMigrationStatus({ loading: false, message: `Failed to ${action} project.`, type: "error" });
      }
    } catch (e) {
      setMigrationStatus({ loading: false, message: "Error communicating with server.", type: "error" });
    }
  };

  const handleBackup = async () => {
    setMigrationStatus({ loading: true, message: "Generating backup...", type: "info" });
    try {
      const res = await fetch("/api/control-plane/project/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMigrationStatus({ loading: false, message: `Backup ready: ${data.message}`, type: "success" });
      } else {
        setMigrationStatus({ loading: false, message: "Failed to generate backup.", type: "error" });
      }
    } catch (e) {
      setMigrationStatus({ loading: false, message: "Error communicating with server.", type: "error" });
    }
  };

  const handleUpgrade = async () => {
    setMigrationStatus({ loading: true, message: "Initiating upgrade...", type: "info" });
    try {
      const res = await fetch("/api/control-plane/project/upgrade", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMigrationStatus({ loading: false, message: data.message, type: "success" });
      } else {
        setMigrationStatus({ loading: false, message: "Failed to upgrade project.", type: "error" });
      }
    } catch (e) {
      setMigrationStatus({ loading: false, message: "Error communicating with server.", type: "error" });
    }
  };

  const handleMigrateGitHub = async () => {
    const repoUrl = prompt("Enter GitHub Repository URL:");
    const projectName = prompt("Enter a name for this project:");

    if (!repoUrl || !projectName) return;

    setMigrationStatus({
      loading: true,
      message: "Migrating from GitHub...",
      type: "info",
    });

    try {
      const response = await fetch("/api/control-plane/migrate/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, projectName }),
      });

      const data = await response.json();

      if (response.ok) {
        setMigrationStatus({
          loading: false,
          message: `Success! Schema created: ${data.schema}`,
          type: "success",
        });
      } else {
        setMigrationStatus({
          loading: false,
          message: `Error: ${data.error}`,
          type: "error",
        });
      }
    } catch (error) {
      setMigrationStatus({
        loading: false,
        message: "Failed to connect to the migration server.",
        type: "error",
      });
    }
  };

  const handleMigrateLovable = async () => {
    const projectId = prompt("Enter Lovable Project ID:");
    const projectName = prompt("Enter a name for this project:");

    if (!projectId || !projectName) return;

    setMigrationStatus({
      loading: true,
      message: "Migrating from Lovable...",
      type: "info",
    });

    try {
      const response = await fetch("/api/control-plane/migrate/lovable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, projectName }),
      });

      const data = await response.json();

      if (response.ok) {
        setMigrationStatus({
          loading: false,
          message: `Success! Schema created: ${data.schema}`,
          type: "success",
        });
      } else {
        setMigrationStatus({
          loading: false,
          message: `Error: ${data.error}`,
          type: "error",
        });
      }
    } catch (error) {
      setMigrationStatus({
        loading: false,
        message: "Failed to connect to the migration server.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans p-8">
      <header className="mb-12 border-b border-gray-700 pb-4">
        <h1 className="text-4xl font-bold tracking-tight">
          {t("brand")} Dashboard
        </h1>
        <p className="text-gray-400 mt-2 text-lg">ZimaOS Local Environment</p>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Environment Status Panel */}
        <section className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-100">
              System Status
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${projectState === "active" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
              Project {projectState === "active" ? "Active" : "Paused"}
            </span>
          </div>
          <ul className="space-y-3">
            <li className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
              <span className="font-medium text-gray-300">
                Database (PostgreSQL)
              </span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                Online
              </span>
            </li>
            <li className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
              <span className="font-medium text-gray-300">
                API Gateway (Kong)
              </span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                Online
              </span>
            </li>
            <li className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
              <span className="font-medium text-gray-300">Control Plane</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                Online
              </span>
            </li>
            <li className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
              <span className="font-medium text-gray-300">Auth (Custom)</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                Online
              </span>
            </li>
          </ul>
        </section>

        {/* Project Migration Panel */}
        <section className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col">
          <h2 className="text-2xl font-semibold mb-4 text-gray-100">
            Migrate Projects
          </h2>
          <p className="text-gray-400 mb-6 flex-1">
            Import your external projects directly into your secure, local
            ZimaOS environment.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handlePauseResume}
                disabled={migrationStatus.loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {projectState === "paused" ? "Resume Project" : "Pause Project"}
              </button>
              <button
                onClick={handleUpgrade}
                disabled={migrationStatus.loading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Upgrade to Pro
              </button>
            </div>

            <button
              onClick={handleBackup}
              disabled={migrationStatus.loading}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
            >
              Download Backups
            </button>

            <hr className="border-gray-700 my-4" />

            <button
              onClick={handleMigrateGitHub}
              disabled={migrationStatus.loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              Migrate from GitHub
            </button>
            <button
              onClick={handleMigrateLovable}
              disabled={migrationStatus.loading}
              className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              Migrate from Lovable
            </button>

            <div className="pt-4 mt-4 border-t border-gray-700 space-y-4">
              <Link
                href="/editor"
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Open Table Editor
              </Link>
              <Link
                href="/storage"
                className="w-full flex items-center justify-center gap-3 bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Storage Visual Manager
              </Link>
            </div>
          </div>

          {migrationStatus.message && (
            <div
              className={`mt-6 p-4 rounded-lg border ${
                migrationStatus.type === "success"
                  ? "bg-green-900/30 border-green-700 text-green-300"
                  : migrationStatus.type === "error"
                    ? "bg-red-900/30 border-red-700 text-red-300"
                    : "bg-blue-900/30 border-blue-700 text-blue-300"
              }`}
            >
              {migrationStatus.message}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>
          Neer-Data-Base BaaS - Running 100% locally on ZimaOS. No external
          dependencies.
        </p>
      </footer>
    </div>
  );
}
