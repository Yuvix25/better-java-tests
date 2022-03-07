const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { enableTests } = require('./dependenciesDownloader');

const useCodex = false;
var codexCompletion;

if (useCodex) { 
	codexCompletion = require('./completions').codexCompletion;
}

async function createTests() {
	
	await enableTests();

	let editor = vscode.window.activeTextEditor;
	let filePath = editor.document.fileName;
	let dirPath = path.dirname(filePath);

	// get all files in the directory
	let files = fs.readdirSync(dirPath);
	let javaFiles = [];
	let completions = [];
	for (let i = 0; i < files.length && i < 3; i++) {
		let file = files[i];
		if (file.endsWith('.java') && !file.endsWith('Test.java')) {
			if (useCodex) {
				let comp = await codexCompletion(path.join(dirPath, file));
				comp = comp.substring(0, comp.indexOf('\n'));
				completions.push(comp);
			}

			javaFiles.push(path.basename(file, '.java'));
		}
	}

	let testFilePath = path.join(dirPath, 'JavaTest.java');
	let testFileContent = `
import org.junit.Test;
import static org.junit.Assert.*;

public class JavaTest {`;
	
	for (let i = 0; i < javaFiles.length; i++) {
		let file = javaFiles[i];
		let testFuncContent = useCodex ? completions[i] : `        ${file} tester = new ${file}();
		assertTrue(true);`;

		testFileContent += `
	@Test
	public void test${file}() {
${testFuncContent}
	}
`;
	}

	testFileContent += `
}`;

	// create the test file
	const wsedit = new vscode.WorkspaceEdit();
	wsedit.createFile(vscode.Uri.file(testFilePath), { ignoreIfExists: true });
	await vscode.workspace.applyEdit(wsedit);

	await vscode.window.showTextDocument(vscode.Uri.file(testFilePath));

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

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "better-java-tests" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('better-java-tests.createTests', createTests);

	// function () {
	// 	// The code you place here will be executed every time your command is executed

	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from BetterJavaTests!');
	// }

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
