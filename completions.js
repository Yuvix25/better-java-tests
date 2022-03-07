const vscode = require('vscode');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

module.exports = {
    codexCompletion
}


async function codexCompletion(file) {
	console.log(file);
	let data = "";
	await vscode.workspace.openTextDocument(vscode.Uri.file(file)).then(async (document) => {
		let text = document.getText();
		let prompt = `import org.junit.Test;
import static org.junit.Assert.*;

${text}
		
public class JavaTest {
	@Test
	public void test${file}() {
`

		const params = {
			"prompt": prompt,
			"max_tokens": 70,
			"temperature": 0.1,
		}

		const response = await openai.createCompletion("code-davinci-001", params);
		// console.log(response.data);
		data = response.data.choices[0].text;
	});
	return data;
}