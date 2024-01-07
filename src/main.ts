import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import * as tc from '@actions/tool-cache';
import * as io from '@actions/io';
import os from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

type Platform = 'windows' | 'macos' | 'linux';
type Architecture = 'arm' | 'x64';

const toolName = 'dcm';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github_token', { required: true });

    const version = await getVersion(token);
    const platform = getPlatform();
    const architecture = getArchitecture();

    core.info(`Installing DCM ${version} for ${platform}-${architecture}.`);

    const url = getDownloadLink(version, platform, architecture);
    const path = await downloadExe(url, version, architecture);

    core.setOutput(`${toolName}-version`, version);

    if (platform !== 'windows') {
      const exePath = join(path, toolName);
      const binPath = join(path, 'bin');
      const newPath = join(binPath, toolName);

      await io.mv(exePath, newPath);

      await exec.exec('chmod', ['755', newPath]);
      core.addPath(binPath);
    } else {
      core.addPath(path);
    }

    await exec.exec(toolName, ['--version']);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

async function getVersion(token: string): Promise<string> {
  const version = core.getInput('version');

  if (version === 'latest') {
    const octokit = github.getOctokit(token);

    const latestRelease = await octokit.rest.repos.getLatestRelease({
      repo: 'homebrew-dcm',
      owner: 'CQLabs',
    });

    return latestRelease.data.tag_name;
  }

  return version;
}

function getPlatform(): Platform {
  const platform = os.platform();

  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';

  return 'linux';
}

function getArchitecture(): Architecture {
  if (['arm', 'arm64'].includes(os.arch())) return 'arm';

  return 'x64';
}

function getDownloadLink(version: string, platform: Platform, architecture: Architecture): string {
  if (platform === 'windows') {
    return `https://github.com/CQLabs/homebrew-dcm/releases/download/${version}/dcm-${platform}-release.zip`;
  }

  return `https://github.com/CQLabs/homebrew-dcm/releases/download/${version}/dcm-${platform}-${architecture}-release.zip`;
}

async function downloadExe(
  url: string,
  version: string,
  architecture: Architecture,
): Promise<string> {
  const fromCache = tc.find(toolName, version, architecture);
  if (fromCache !== '' && existsSync(join(fromCache, toolName))) {
    core.info(`Using cached version from ${fromCache}.`);

    return fromCache;
  }

  core.info(`Downloading from ${url}...`);

  const archive = await tc.downloadTool(url);
  const extracted = await tc.extractZip(archive);
  const path = await tc.cacheDir(extracted, toolName, version, architecture);

  core.info(`Extracted path: ${path}.`);

  return path;
}

run();
