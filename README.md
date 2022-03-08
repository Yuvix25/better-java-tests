## Features

Initialize your Java tests more easily - and create them automatically using OpenAI's Codex! (requires OpenAI API key)

## Requirements

 - [Test Runner for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-test) (recommended)
 - OpenAI API key (only for automatic test creation with Codex)

## Usage

First, if you have an OpenAI API key, enter it in the settings, and enable `Use Codex` if you want to autogenerate the tests.  
Then, run the following command `Ctrl+Shift+P`, and select `Create Java Tests`.

## Installation

This extension is available in the [Marketplace](https://marketplace.visualstudio.com/items?itemName=Yuvix25.better-java-tests), and you can find it in the extensions tab by searching "better-java-tests".  

Alternativly, you can compile it yourself:
Clone the repository using `git clone https://github.com/Yuvix25/better-java-tests.git`,  
run `npm install -g vsce`,
and then `vsce package` within the `better-java-tests` directory,  
and finally install the generated VSIX file in Visual Studio Code like so:
 - Open the extensions tab (`Ctrl+Shift+X`)
 - Click on the 3 dots in the right top corner of the extensions list
 - Choose `Install from VSIX`, and select the generated VSIX file.