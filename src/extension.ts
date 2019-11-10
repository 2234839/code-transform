import * as vscode from 'vscode';
const fun: {
	[name: string]: {
		[str: string]: (str: string) => string
	}
} = {}

export function activate(context: vscode.ExtensionContext) {
	eval_code(context)
	let disposable = vscode.commands.registerCommand('extension.transform', async () => {
		const pickItem: string[] = []
		const fun_obj: {
			[str: string]: (str: string) => string
		} = {}
		for (const key in fun) {
			const fun_child = fun[key];
			for (const _key in fun_child) {
				const element = fun_child[_key];
				fun_obj[`${_key}-->${key}`] = element
				pickItem.push(`${_key}-->${key}`)
			}
		}
		const res = await vscode.window.showQuickPick(pickItem)
		console.log("用户选择", res);
		if (res === undefined) return;
		replace(fun_obj[res])
	});
	let setFun = vscode.commands.registerCommand('extension.setFun', async () => {
		const uris = await vscode.window.showOpenDialog({ filters: { js: ["js"] }, canSelectMany: true })
		if (uris === undefined) return;
		const fun_file: {
			name: string,
			content: string
		}[] = []
		for (let i = 0; i < uris.length; i++) {
			const uri = uris[i];
			const file = await vscode.workspace.fs.readFile(uri)
			let matcher = uri.path.match(/.*\/(.*?)\.js$/)
			if (matcher === null) return console.error("文件名可能不对");
			fun_file.push({
				name: matcher[1], content: file.toString()
			})
		}
		console.log("fun_file", fun_file);

		await context.globalState.update("fun", fun_file)
		eval_code(context)
	});
	context.subscriptions.push(disposable);
	context.subscriptions.push(setFun);
}

// this method is called when your extension is deactivated
export function deactivate() { }

async function eval_code(context: vscode.ExtensionContext) {
	const fun_file = await context.globalState.get("fun", []) as {
		name: string,
		content: string
	}[]

	fun_file.forEach(file => {
		let funObj
		try {
			funObj = eval(file.content)
		} catch (error) {
			return console.error("解析代码失败",error);
		}
		let obj = { [file.name]: funObj }
		Object.assign(fun, obj)
	})
	console.dir(fun);
}

function replace(getText: (str: string) => string) {
	const editor = vscode.window.activeTextEditor
	if (editor === undefined) return;

	editor.edit((editBuilder) => {
		editor.selections.map(selection => {
			/** 当前选中的文本 */
			let text = editor.document.getText(selection)
			/** 选中范围 */
			let range: vscode.Range = selection
			if (text === "") {
				/** 没有文本认为是选中了一行 */
				text = editor.document.lineAt(selection.active).text
				range = editor.document.lineAt(selection.active).range
			}

			let new_text
			try {
				new_text = getText(text)
			} catch (error) {
				console.error("转换失败", error);
				return ""
			}
			console.log(range, text, new_text);

			editBuilder.replace(range, new_text)
		})
	})

	vscode.window.showInformationMessage('转变代码!');
}