import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { existsSync, readFileSync } from 'fs';
import os from 'os';
import { join } from 'path';
import { satisfies } from 'semver';
import { YAMLMap, parseDocument } from 'yaml';

type Platform = 'windows' | 'macos' | 'linux';
type Architecture = 'arm' | 'x64';

const toolName = 'dcm';
const configFileName = 'dcm_global.yaml';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });

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

  if (version === 'auto') {
    const globalConfigPath = await getGlobalConfigPath();

    const versionRange = parseDocument<YAMLMap>(readFileSync(globalConfigPath).toString()).get(
      'version',
    ) as string | undefined;
    if (!versionRange) {
      throw new Error(
        'Failed to automatically detect the version. Unable to parse the version range from the configuration file.',
      );
    }

    const octokit = github.getOctokit(token);

    const releases = await octokit.rest.repos.listReleases({
      repo: 'homebrew-dcm',
      owner: 'CQLabs',
      per_page: 30,
    });

    const matchingRelease = releases.data.find(release =>
      satisfies(release.tag_name, versionRange),
    );
    if (!matchingRelease) {
      throw new Error(
        'Failed to automatically detect the version. A matching DCM version could not be found.',
      );
    }

    return matchingRelease.tag_name;
  }

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

async function getGlobalConfigPath(): Promise<string> {
  let root = core.getInput('working-directory');

  if (!root) {
    await exec.exec('git', ['rev-parse', '--show-toplevel'], {
      listeners: {
        stdout: (data: Buffer) => {
          root += data.toString().trim();
        },
      },
    });
  }

  if (!root) {
    throw new Error('Failed to find the repository root.');
  }

  const globalConfigPath = join(root, configFileName);
  if (!existsSync(globalConfigPath)) {
    throw new Error(
      'Failed to automatically detect the version. Global configuration file does not exists.',
    );
  }

  return globalConfigPath;
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
