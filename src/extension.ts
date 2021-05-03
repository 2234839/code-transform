import * as vscode from "vscode";
import { window, workspace } from "vscode";
import * as gogocode from "gogocode";

const fun: {
  [name: string]: {
    [str: string]: (str: string) => string;
  };
} = {};

let list = [] as string[];
export function activate(context: vscode.ExtensionContext) {
  list = workspace.getConfiguration("表征转换").get("转换规则") as string[];
  const 启用表征转换 = workspace.getConfiguration("表征转换").get("启用");
  // console.log("[启用表征转换]", 启用表征转换);
  eval_code(context);
  let disposable = vscode.commands.registerCommand(
    "extension.transform",
    async () => {
      const pickItem: string[] = [];
      const fun_obj: {
        [str: string]: (str: string) => string;
      } = {};
      for (const key in fun) {
        const fun_child = fun[key];
        for (const _key in fun_child) {
          const element = fun_child[_key];
          fun_obj[`${_key}-->${key}`] = element;
          pickItem.push(`${_key}-->${key}`);
        }
      }
      const res = await vscode.window.showQuickPick(pickItem);
      if (res === undefined) {
        return;
      }
      replace(fun_obj[res]);
    },
  );
  let setFun = vscode.commands.registerCommand("extension.setFun", async () => {
    const uris = await vscode.window.showOpenDialog({
      filters: { js: ["js"] },
      canSelectMany: true,
    });
    if (uris === undefined) {
      return;
    }
    const fun_file: {
      name: string;
      content: string;
    }[] = [];
    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      console.log("[uri]", uri);
      const file = await vscode.workspace.fs.readFile(uri);
      let matcher = uri.path.match(/.*\/(.*?)\.js$/);
      if (matcher === null) {
        return console.error("文件名可能不对");
      }
      fun_file.push({
        name: matcher[1],
        content: file.toString(),
      });
    }

    await context.globalState.update("fun", fun_file);
    eval_code(context);
  });
  context.subscriptions.push(disposable);
  context.subscriptions.push(setFun);

  const f = debounce(render, 600);
  if (启用表征转换) {
    vscode.workspace.onDidChangeTextDocument(f);
  }
}

type s = { r: vscode.Range; d: vscode.DecorationOptions };

const documentDecor = new WeakMap<
  vscode.TextDocument,
  { d: vscode.TextEditorDecorationType; s: s[] }
>();

function render(textDocument: vscode.TextDocumentChangeEvent) {
  const d = textDocument.document;

  /** 这一轮的装饰器 */
  if (documentDecor.get(d) === undefined) {
    documentDecor.set(d, {
      d: window.createTextEditorDecorationType({
        color: "#ff9977",
        after: {
          color: "#FF00FF",
          border: "solid black 1px",
          contentText: "",
        },
        /** 通过这种 hack 方式隐藏正文，使用户第一眼看到的是上面的after的内容 */
        textDecoration: "none; display: none;",
      }),
      s: [],
    });
  }
  const c = documentDecor.get(d)!;
  let dList = c.s;
  dList = [];
  list.forEach((s) => {
    const r = eval(s);
    match(r);
  });
  /** 生成新的了，所以清除掉 */
  const activeEditor = vscode.window.activeTextEditor!;
  const selections = vscode.window.activeTextEditor!.selections.map(
    (el) => activeEditor.document.lineAt(el.active).range,
  );

  const targetList = dList
    .map((el) => el.d)
    .filter((el) => !selections.find((s) => s.contains(el.range)));
  activeEditor.setDecorations(c!.d, targetList);

  function match(regEx: RegExp) {
    const text = d.getText();
    let match;

    while ((match = regEx.exec(text))) {
      const startPos = d.positionAt(match.index);
      const endPos = d.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      if (range) {
        dList.push({
          r: range,
          d: {
            range,
            hoverMessage: "code-transform test hover",
            renderOptions: {
              after: {
                contentText: `> 💝💫💨 ${d.getText(range)} <`,
              },
            },
          },
        });
      } else {
        console.log("空range");
      }
    }
  }
}

function debounce(fun: (...args: any[]) => void, delay: number) {
  let id = undefined as any;
  return function (...args: any[]) {
    if (id !== undefined) {
      clearTimeout(id);
    }
    id = setTimeout(function () {
      console.log("更新");
      fun(...args);
    }, delay);
  };
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function eval_code(context: vscode.ExtensionContext) {
  const fun_file = (await context.globalState.get("fun", [])) as {
    name: string;
    content: string;
  }[];

  fun_file.forEach((file) => {
    let funObj;
    try {
      funObj = eval(file.content)({
        /** ast 转换工具 */
        gogocode,
      });
    } catch (error) {
      return console.error("解析代码失败", error);
    }
    let obj = { [file.name]: funObj };
    Object.assign(fun, obj);
  });
}

/** 替换选中的代码为转换后的 */
function replace(getText: (str: string) => string) {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return;
  }

  editor.edit((editBuilder) => {
    editor.selections.map((selection) => {
      /** 当前选中的文本 */
      let text = editor.document.getText(selection);
      /** 选中范围 */
      let range: vscode.Range = selection;
      if (text === "") {
        /** 没有文本认为是选中了一行 */
        text = editor.document.lineAt(selection.active).text;
        range = editor.document.lineAt(selection.active).range;
      }

      let new_text;
      try {
        new_text = getText(text);
        editBuilder.replace(range, new_text);
      } catch (error) {
        console.error("转换失败", error);
        vscode.window.showInformationMessage("转换失败!" + error);
        return "";
      }
    });
  });

  // vscode.window.showInformationMessage("转变代码!");
}

function someRange(r1: vscode.Range, r2: vscode.Range) {
  return r1.isEqual(r2);
}
