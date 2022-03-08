const vscode = require('vscode');
const { Configuration, OpenAIApi } = require("openai");

module.exports = {
    codexCompletion
}


async function codexCompletion(file) {
	if (!vscode.workspace.getConfiguration('better-java-tests').get('openAiKey')) {
		vscode.window.showErrorMessage('OpenAI API key not set. Please set it in the settings.');
		return;
	}

	const configuration = new Configuration({
		apiKey: vscode.workspace.getConfiguration('better-java-tests').get('openAiKey'),
	});
	const openai = new OpenAIApi(configuration);


	console.log(file);
	let data = "";
	await vscode.workspace.openTextDocument(vscode.Uri.file(file)).then(async (document) => {
		let text = document.getText();
		text = text.replace("public class", "private class");
		let prompt = `import org.junit.Test;
import static org.junit.Assert.*;

${text}

public class JavaTest {
	@Test
	public void test${file}() {
		System.out.println("--------------------------- ${file} ---------------------------");
		`;

		const params = {
			"prompt": prompt,
			"max_tokens": 200,
			"temperature": 0,
		}
		let response;
		let i = 0;
		while (response == undefined && i < 2) {
			try {
				response = await openai.createCompletion("code-davinci-001", params);
			} catch (e) {
				console.log("An error occurred while retreiving completion from OpenAI: " + e);
			}
			
			i++;
		}
		if (response == undefined) {
			vscode.window.showErrorMessage("An error occurred while retreiving completion from OpenAI, so some of the testers are empty. Please try again later.");
		} else {
			data = response.data.choices[0].text;
		}
	});
	return data;
}