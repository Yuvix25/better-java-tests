const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { enableTests } = require('./dependenciesDownloader');

const codexCompletion = require('./completions').codexCompletion;

const { parse } = require("java-parser");


function sleep(ms) {
	return new Promise((resolve) => {
	    setTimeout(resolve, ms);
	});
}

function processCompletion(comp) {
	// all lines which are still within the same function
	let lines = comp.split('\n');
	let res = "";
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		try {
			parse("public class Tester {\n    public void test() {\n        " + res + line + "\n}");
			return res.substring(0, res.length - 1);
		} catch (e) {
			res += line + '\n';
		}
	}

	return "";
}

async function* getTesters(dirPath, useCodex, progress=undefined) {
	let files = fs.readdirSync(dirPath);
	let javaFiles = [];
	let completions = [];
	let totalFiles = 0;

	for (let i = 0; i < files.length; i++) {
		if (files[i].endsWith('.java') && !files[i].endsWith('Test.java'))
			totalFiles++;
	}

	for (let i = 0; i < files.length; i++) {
		let file = files[i];
		if (file.endsWith('.java') && !file.endsWith('Test.java')) {
			if (progress) {
				progress.report({
					message: `Processing ${file}`
				});
			}

			if (useCodex) {
				let comp = await codexCompletion(path.join(dirPath, file));
				if (comp == undefined) {
					return;
				}
				
				comp = processCompletion(comp);
				completions.push(comp);
			}

			javaFiles.push(path.basename(file, '.java'));
			yield [javaFiles, completions];
			if (progress) {
				progress.report({
					message: `Processing ${file}`,
					increment: 100 / totalFiles
				});
			}
		}
	}

	return [javaFiles, completions];
}


async function createTests() {
	var config = vscode.workspace.getConfiguration('better-java-tests');
	var useCodex = config.get('useCodex');
	
	await enableTests();

	let editor = vscode.window.activeTextEditor;
	let filePath = editor.document.fileName;
	let dirPath = path.dirname(filePath);

	let res;
	if (useCodex) {
		let cancelToken;
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: 'Loading testers'
		}, async (progress, cToken) => {
			progress.report({  increment: 0 });
			var generator = getTesters(dirPath, useCodex, progress);
			for await (let [javaFiles, completions] of generator) {
				res = [javaFiles, completions];
				cancelToken = cToken;
				if (cToken.isCancellationRequested) {
					return;
				}
			}
			// res = await getTesters(dirPath, useCodex, progress);
			progress.report({ increment: 100 });
			cancelToken = cToken;
		});
		// @ts-ignore
		if (cancelToken != undefined && cancelToken.isCancellationRequested) {
			return;
		}

	} else {
		// res = await getTesters(dirPath, useCodex);
		let generator = getTesters(dirPath, useCodex);
		for await (let [javaFiles, completions] of generator) {
			res = [javaFiles, completions];
		}
	}


	if (res == undefined) {
		return;
	}
	let javaFiles = res[0];
	let completions = res[1];

	let testFilePath = path.join(dirPath, 'JavaTest.java');


	let testFileContent = `import org.junit.Test;
import static org.junit.Assert.*;

public class JavaTest {`;
	


	for (let i = 0; i < javaFiles.length; i++) {
		let file = javaFiles[i];

		let testFuncContent = useCodex ? completions[i] : `${file} tester = new ${file}();`;

		testFileContent += `
	@Test
	public void test${file}() {
		System.out.println("\\n--------------------------- ${file} ---------------------------");
		${testFuncContent}
	}
`;

	}


	testFileContent += '}';

	// create the test file
	const wsedit = new vscode.WorkspaceEdit();
	wsedit.createFile(vscode.Uri.file(testFilePath), { ignoreIfExists: true });
	await vscode.workspace.applyEdit(wsedit);

	await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));

	await sleep(500);

	editor = vscode.window.activeTextEditor;

	// replace the content of the test file
	var firstLine = editor.document.lineAt(0);
	var lastLine = editor.document.lineAt(editor.document.lineCount - 1);
	wsedit.delete(editor.document.uri, new vscode.Range(firstLine.range.start, lastLine.range.end));
	await vscode.workspace.applyEdit(wsedit);
	wsedit.insert(editor.document.uri, new vscode.Position(0, 0), testFileContent);
	await vscode.workspace.applyEdit(wsedit);

	await vscode.workspace.saveAll();
}



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('"better-java-tests" loaded.');
	let disposable = vscode.commands.registerCommand('better-java-tests.createTests', createTests);
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
