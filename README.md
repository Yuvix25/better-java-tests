## Features

Initialize your Java tests more easily - and create them automatically using OpenAI's Codex! (requires OpenAI API key)

## Requirements

 - [Test Runner for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-test) (recommended)
 - OpenAI API key (only for automatic test creation with Codex)

## Usage

If you have an OpenAI API key, enter it in the settings, and enable `Use Codex` if you want to autogenerate the tests.  
Open a file within your `src` directory containing all your Java files, run the following command `Ctrl+Shift+P`, and select `Create Java Tests`.
This will create a file named `JavaTest.java` in the same directory as your file, containing a test method for each file in the directory.

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


## Examples

Input Java code:
```java
public class Example {
    public static int binarySearch(int[] array, int target) {
        int left = 0;
        int right = array.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (array[mid] == target) {
                return mid;
            } else if (array[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }
}

```

Output tester:
```java
import org.junit.Test;
import static org.junit.Assert.*;

public class JavaTest {
	@Test
	public void testExample() {
		System.out.println("\n--------------------------- Example ---------------------------");
		int[] array = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
		int target = 5;
		int result = Example.binarySearch(array, target);
		assertEquals(4, result);
	}
}

```