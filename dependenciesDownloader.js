
// import { ProgressLocation, window, workspace } from 'vscode';
// import * as path from 'path';
// import * as https from 'https';
// import * as fse from 'fs-extra';
// import * as _ from 'lodash';
// import * as os from 'os';
// import { createWriteStream } from 'fs';
// import { URL } from 'url';

const { ProgressLocation, window, workspace } = require('vscode');
const path = require('path');
const https = require('https');
const fse = require('fs-extra');
const _ = require('lodash');
const os = require('os');
const { createWriteStream } = require('fs');
const { URL } = require('url');


module.exports = {
    enableTests,
};


async function enableTests(testKind=undefined) {
    const project = await getTargetProject();
    if (!project) {
        return;
    }

    await setupUnmanagedFolder(project.uri, testKind);
    return;
}

async function getTargetProject() {
    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
        return workspace.workspaceFolders[0];
    } else {
        // sendError(new Error('Failed to find a project to enable tests.'));
        window.showErrorMessage('Failed to find a project to enable tests.');
        return undefined;
    }
}

const TestKind = {
    JUnit5: 0,
    JUnit: 1,
    TestNG: 2,
    None: 100,
}

async function setupUnmanagedFolder(projectUri, testKind=undefined) {
    testKind = await getTestKind();
    if (testKind === undefined) {
        return;
    }
    const libFolder = await getLibFolder(projectUri);
    const libFolderExists = await fse.pathExists(libFolder);

    const all_metadata = getJarIds(testKind);
    var metadata = [];
    if (!libFolderExists) {
        await fse.ensureDir(libFolder);
    } else {
        for (const jar of all_metadata) {
            if (!jar.version) {
                jar.version = await getLatestVersion(jar.groupId, jar.artifactId) || jar.defaultVersion;
            }

            const jarPath = path.join(libFolder, `${jar.artifactId}-${jar.version}.jar`);
            if (!(await fse.pathExists(jarPath))) {
                metadata.push(jar);
            }
        }
        if (metadata.length === 0)
            return;
    }
    console.log(all_metadata);
    console.log(metadata);

    try {
        await window.withProgress({
            location: ProgressLocation.Notification,
            cancellable: true
        }, async (progress, token) => {
            for (const jar of metadata) {
                if (token.isCancellationRequested) {
                    throw new Error('User cancelled');
                }
                progress.report({
                    message: `Downloading ${jar.artifactId}.jar...`,
                });
                
                await downloadJar(libFolder, jar.groupId, jar.artifactId, jar.version, metadata.length, progress, token);
            }
        });
    } catch (e) {
        if (e.message !== 'User cancelled') {
            // sendError(e);
        }
        if (!libFolderExists) {
            fse.remove(libFolder);
        }
        return;
    }

    updateProjectSettings(projectUri, libFolder);
}

async function getTestKind() {
    return 1;

    const framework = await window.showQuickPick([{
        label: 'JUnit Jupiter',
        value: TestKind.JUnit5,
    }, {
        label: 'JUnit',
        value: TestKind.JUnit,
    }, {
        label: 'TestNG',
        value: TestKind.TestNG,
    }], {
        placeHolder: 'Select the test framework to be enabled.'
    });
    return framework.value;
}

async function getLibFolder(projectUri) {
    const referencedLibraries = workspace.getConfiguration('java', projectUri).get('project.referencedLibraries');
    if (_.isArray(referencedLibraries)) {
        // do a simple check if the project uses default lib location.
        if (referencedLibraries.includes('lib/**/*.jar')) {
            return path.join(projectUri.fsPath, 'lib');
        }
    }

    for (let i = 0; i < 100; i++) {
        const folderPath = path.join(projectUri.fsPath, `test-lib${i > 0 ? i : ''}`);
        if (await fse.pathExists(folderPath)) {
            continue;
        }
        return folderPath;
    }

    return path.join(projectUri.fsPath, 'test-lib');
}

function getJarIds(testKind) {
    switch (testKind) {
        case TestKind.JUnit5:
            return [{
                groupId: 'org.junit.platform',
                artifactId: 'junit-platform-console-standalone',
                defaultVersion: '1.8.2',
            }];
        case TestKind.JUnit:
            return [{
                groupId: 'junit',
                artifactId: 'junit',
                defaultVersion: '4.13.2',
            }, {
                groupId: 'org.hamcrest',
                artifactId: 'hamcrest-core',
                version: '1.3',
                defaultVersion: '1.3',
            }];
        case TestKind.TestNG:
            return [{
                groupId: 'org.testng',
                artifactId: 'testng',
                defaultVersion: '7.5',
            }, {
                groupId: 'com.beust',
                artifactId: 'jcommander',
                defaultVersion: '1.82',
            }, {
                groupId: 'org.slf4j',
                artifactId: 'slf4j-api',
                defaultVersion: '1.7.35',
            }];
        default:
            return [];
    }
}

async function getLatestVersion(groupId, artifactId) {
    try {
        const response = await getHttpsAsJSON(getQueryLink(groupId, artifactId));

        if (!response.response.docs[0].latestVersion) {
            // sendError(new Error(`Invalid format for the latest version response`));
            window.showErrorMessage(`Invalid format for the latest version response`);
            return undefined;
        }
        return response.response.docs[0].latestVersion;
    } catch (e) {
        // sendError(new Error(`Failed to fetch the latest version for ${groupId}:${artifactId}`));
        window.showErrorMessage(`Failed to fetch the latest version for ${groupId}:${artifactId}`);
    }

    return undefined;
}

async function downloadJar(
    libFolder,
    groupId,
    artifactId,
    version,
    totalJars,
    progress,
    token
    ) {
    // eslint:disable-next-line: typedef
    await new Promise(async (resolve, reject) => {
        progress.report({
            message: `Downloading ${artifactId}-${version}.jar...`,
        });
        const tempFilePath = path.join(os.tmpdir(), `${artifactId}-${version}.jar`);
        const writer = createWriteStream(tempFilePath);

        const url = getDownloadLink(groupId, artifactId, version);
        const totalSize = await getTotalBytes(url);
        if (token.isCancellationRequested) {
            writer.close();
            return reject(new Error('User cancelled'));
        }
        const req = https.get(url, (res) => {
            res.pipe(writer);
            res.on('data', (chunk) => {
                progress.report({
                    message: `Downloading ${artifactId}-${version}.jar...`,
                    increment: chunk.length / totalSize / totalJars * 100,
                });
            });
        });

        token.onCancellationRequested(() => {
            req.destroy();
            writer.close();
            fse.unlink(tempFilePath);
            reject(new Error('User cancelled'));
        });

        req.on('error', (err) => {
            writer.close();
            fse.unlink(tempFilePath);
            reject(err);
        });

        writer.on('finish', () => {
            writer.close();
            const filePath = path.join(libFolder, `${artifactId}-${version}.jar`);
            fse.move(tempFilePath, filePath, { overwrite: false });
            return resolve();
        });

        writer.on('error', () => {
            writer.close();
            fse.unlink(tempFilePath);
            reject(new Error('Failed to write jar file.'));
        });
    });
}

async function updateProjectSettings(projectUri, libFolder) {
    // if 'referenced libraries' is already set to 'lib/**/*.jar'
    if (path.basename(libFolder) === 'lib') {
        window.showInformationMessage("Test libraries have been downloaded into 'lib/'.");
        return;
    }

    const relativePath = path.relative(projectUri.fsPath, libFolder);
    const testDependencies = path.join(relativePath, '**', '*.jar');
    const configuration = workspace.getConfiguration('java', projectUri);
    let referencedLibraries = configuration.get('project.referencedLibraries');
    if (_.isArray(referencedLibraries)) {
        referencedLibraries.push(testDependencies);
        referencedLibraries = Array.from(new Set(referencedLibraries));
    } else if (_.isObject(referencedLibraries)) {
        // referencedLibraries = referencedLibraries as {include: string[]};
        referencedLibraries = Object.entries(referencedLibraries);
        referencedLibraries.include.push(testDependencies);
        referencedLibraries.include = Array.from(new Set(referencedLibraries.include));
        if (!referencedLibraries.exclude && !referencedLibraries.sources) {
            referencedLibraries = referencedLibraries.include;
        }
    }

    configuration.update('project.referencedLibraries', referencedLibraries);
    window.showInformationMessage(`Test libraries have been downloaded into '${relativePath}/'.`);
}

async function getHttpsAsJSON(link) {
    // tslint:disable-next-line: typedef
    const response = await new Promise((resolve, reject) => {
        let result = '';
        https.get(link, {
            headers: {
                'User-Agent': 'vscode-JavaTestRunner/0.1',
            },
        }, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Request failed with status code: ${res.statusCode}`));
            }
            res.on('data', (chunk) => {
                result = result.concat(chunk.toString());
            });
            res.on('end', () => {
                resolve(result);
            });
            res.on('error', reject);
        });
    });
    return JSON.parse(response);
}

async function getTotalBytes(url){
    // tslint:disable-next-line: typedef
    return new Promise((resolve, reject) => {
      const link = new URL(url);
      const req = https.request({
        host: link.host,
        path: link.pathname,
        method: 'HEAD'
      }, (res) => {
        const num = parseInt(String(res.headers['content-length']), 10);
        resolve(num);
      });
      req.on('error', reject);
      req.end();
    });
}

function getQueryLink(groupId, artifactId) {
    return `https://search.maven.org/solrsearch/select?q=id:%22${groupId}:${artifactId}%22&rows=1&wt=json`;
}

function getDownloadLink(groupId, artifactId, version) {
    return `https://repo1.maven.org/maven2/${groupId.split('.').join('/')}/${artifactId}/${version}/${artifactId}-${version}.jar`
}