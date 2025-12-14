"use strict";

const parser = require("@babel/parser");

const generate = require("@babel/generator").default;

const traverse = require("@babel/traverse").default;

const fs = require("fs");

const utils = require("./utils");

const types = require("@babel/types");


const code = fs.readFileSync("init.js").toString();
const ast = parser.parse(code);
const string_deobfuscators = {};

Array.prototype.equals = function (arr) {
  function is(a, b) {
    // taken from the top answer
    return a === b && (a !== 0 || 1 / a === 1 / b) // false for +0 vs -0
    || a !== a && b !== b; // true for NaN vs NaN
  }

  return this.length == arr.length && this.every((u, i) => is(u, arr[i]));
};

function getRootObject(path) {
  var binding = path.scope.getBinding(path.node.callee.name);

  while (binding?.path?.node?.init?.type === "Identifier") {
    var tmpBinding = binding.path.scope.getBinding(binding.path.node.init.name);
    if (tmpBinding) binding = tmpBinding;else break;
  }

  return binding?.path?.node;
}

traverse(ast, {
  VariableDeclarator(path) {
                if (!types.isMemberExpression(path.node.init)) return;
                if (!["atob", "btoa"].includes(path.node.init.property.name)) return;

                const binding = path.scope.getBinding(path.node.id.name);
                if (!binding) return;

                for (let ref of binding.referencePaths) {
                    var caller = ref;
                    for (var i = 0; i < 5; i++)
                        caller = caller.parentPath;
                    if (!caller.isFunctionDeclaration()) continue;
                  console.log(caller.node.id.name, path.node.init.property.name);
                    const binding2 = caller.scope.getBinding(caller.node.id.name);

                    for (let ref2 of binding2.referencePaths) {
                        if (ref2.parentPath.isCallExpression() && types.isStringLiteral(ref2.parentPath.node.arguments[0])) {
                            var newString;
                            switch (path.node.init.property.name) {
                                case "atob":
                                    newString = atob(ref2.parentPath.node.arguments[0].value);
                                    break;
                                case "btoa":
                                    newString = btoa(ref2.parentPath.node.arguments[0].value);
                                    break;
                            }
                            ref2.parentPath.replaceWith(types.valueToNode(newString))
                        }
                    }

                    break;
                }
            }

});
traverse(ast, {
  FunctionDeclaration(path) {
    if (types.isBlockStatement(path.node.body) && path.node.body.body.length === 2 && types.isVariableDeclaration(path.node.body.body[0]) && path.node.body.body[0].declarations.length === 1 && types.isCallExpression(path.node.body.body[0].declarations[0].init) && types.isReturnStatement(path.node.body.body[1]) && types.isCallExpression(path.node.body.body[1].argument) && types.isAssignmentExpression(path.node.body.body[1].argument.callee) && types.isAssignmentExpression(path.node.body.body[1].argument.callee)) {
      var eval_code = "";
      eval_code += code.slice(path.node.start, path.node.end) + "\n";
      const binding = path.scope.getBinding(path.node.body.body[0].declarations[0].init.callee.name);
      eval_code += code.slice(binding.path.node.start, binding.path.node.end) + "\n";

      for (var i = 0; i < binding.referencePaths.length; i++) {
        const reference = binding.referencePaths[i];
        const parent = reference.parentPath.node;

        if (!types.isCallExpression(parent) || parent.arguments.length != 1 || parent.arguments[0].name != path.node.body.body[0].declarations[0].init.callee.name) {
          continue;
        }

        eval_code += "!" + code.slice(parent.start, parent.end) + "\n";
        eval_code += `JSON.stringify(${path.node.body.body[0].declarations[0].init.callee.name}())\n`;
        string_deobfuscators[path.node.id.name] = {
          n: -path.node.body.body[1].argument.callee.right.body.body[0].argument.property.right.value,
          strings: JSON.parse(eval(eval_code))
        };
      }
    }
  }

});
traverse(ast, {
  CallExpression(path) {
    var rootCallee = getRootObject(path);
    if (rootCallee?.type !== "FunctionDeclaration") return;
    if (path.parent?.callee?.name === "parseInt") return;
    const deobfuscator = string_deobfuscators[rootCallee.id.name];

    if (deobfuscator) {
      const arg0 = path.node.arguments[0];
      if (!arg0) return;

      if (types.isNumericLiteral(arg0)) {
        path.replaceWith(types.stringLiteral(deobfuscator.strings[arg0.value + deobfuscator.n]));
      } else if (types.isMemberExpression(arg0)) {
        const object_binding = path.scope.getBinding(arg0.object.name);
        if (!object_binding) return;

		var init = object_binding.path.node.init;

		if (!init) {
			var init = object_binding.constantViolations[0].node.right;
		}

        for (var i = 0; i < init.properties.length; i++) {
          if (init.properties[i].key.name === arg0.property.name) {
            path.replaceWith(types.stringLiteral(deobfuscator.strings[init.properties[i].value.value + deobfuscator.n]));
          }
        }
      } else {
        const arg0_binding = path.scope.getBinding(arg0.name);
        if (!arg0_binding) return;

        if (types.isNumericLiteral(arg0_binding.path.node.init)) {
          path.replaceWith(types.stringLiteral(deobfuscator.strings[arg0_binding.path.node.init.value + deobfuscator.n]));
        }
      }
    }
  }

});
traverse(ast, {
  FunctionDeclaration(path) {
    var function_body = path.node.body;
    if (!types.isBlockStatement(function_body)) return;
    var body = function_body.body;
    if (body.length !== 2) return;
    if (!types.isForStatement(body[0])) return;
    if (!types.isReturnStatement(body[1])) return;
    if (!types.isVariableDeclaration(body[0].init)) return;
    if (body[0].init.declarations.length !== 4) return;
    if (!types.isBinaryExpression(body[0].test)) return;
    if (!types.isUpdateExpression(body[0].update)) return;
    if (!types.isExpressionStatement(body[0].body)) return;
    if (!types.isAssignmentExpression(body[0].body.expression)) return;
    if (!types.isIdentifier(body[1].argument)) return;
    traverse(ast, {
      CallExpression(path2) {
        if (getRootObject(path2)?.start !== path.node.start) return;
        path2.replaceWith(types.stringLiteral(utils.n(path2.node.arguments[0].value)));
      }

    });
  }
});

traverse(ast, {
  VariableDeclarator(path) {
                if (!types.isMemberExpression(path.node.init)) return;
                if (!["atob", "btoa"].includes(path.node.init.property.name)) return;

                const binding = path.scope.getBinding(path.node.id.name);
                if (!binding) return;

                for (let ref of binding.referencePaths) {
                    var caller = ref;
                    for (var i = 0; i < 5; i++)
                        caller = caller.parentPath;
                    if (!caller.isFunctionDeclaration()) continue;

                    const binding2 = caller.scope.getBinding(caller.node.id.name);

                    for (let ref2 of binding2.referencePaths) {
                        if (ref2.parentPath.isCallExpression() && types.isStringLiteral(ref2.parentPath.node.arguments[0])) {
                            var newString;
                            switch (path.node.init.property.name) {
                                case "atob":
                                    newString = atob(ref2.parentPath.node.arguments[0].value);
                                    break;
                                case "btoa":
                                    newString = btoa(ref2.parentPath.node.arguments[0].value);
                                    break;
                            }
                            ref2.parentPath.replaceWith(types.valueToNode(newString))
                        }
                    }

                    break;
                }
            }

});

traverse(ast, {
  VariableDeclarator(path) {
    if (!types.isIdentifier(path.node.init)) return;
    const binding = path.scope.getBinding(path.node.id.name);
    if (!binding?.constant) return;

    for (var i = 0; i < binding.referencePaths.length; i++) {
      binding.referencePaths[i].replaceWith(path.node.init);
    }
  }

});

traverse(ast, {
  VariableDeclarator(path) {
    if (path.node.init == null) return;
    if (!types.isLiteral(path.node.init) && (!types.isMemberExpression(path.node.init) || !types.isIdentifier(path.node.init.object) || !types.isIdentifier(path.node.init.property))) return;
    const binding = path.scope.getBinding(path.node.id.name);
    if (!binding.constant) return;

    for (let i = 0; i < binding.referencePaths.length; i++) {
      let refPath = binding.referencePaths[i];

      try {
        refPath.replaceWith(path.node.init);
      } catch (e) {}
    }

    path.remove();
  }

});
traverse(ast, {
  FunctionDeclaration(path) {
    if (!types.isBlockStatement(path.node.body) || path.node.body.body.length !== 1 || !types.isReturnStatement(path.node.body.body[0]) || !types.isLiteral(path.node.body.body[0].argument)) return;
    const binding = path.scope.getBinding(path.node.id.name);
    if (!binding.constant) return;

    for (var i = 0; i < binding.referencePaths.length; i++) {
      const parent = binding.referencePaths[i].parentPath;
      if (!types.isCallExpression(parent.node) || parent.node.callee.name !== path.node.id.name) continue;
      parent.replaceWith(path.node.body.body[0].argument);
    }
  }

});
traverse(ast, {
  CallExpression(path) {
    const {
      callee,
      arguments: params
    } = path.node;
    if (!types.isMemberExpression(callee) || !types.isIdentifier(callee.object)) return;
    const binding = path.scope.getBinding(callee.object.name);
    if (!binding) return;
    if (!types.isVariableDeclarator(binding.path.node) || !types.isObjectExpression(binding.path.node.init)) return;
    var functionHolder = {};

    for (let property of binding.path.node.init.properties) {
      functionHolder[property.key.name] = property.value;
    }

    for (let referencePath of binding.referencePaths) {
      const declaration = referencePath.parentPath?.parentPath?.node;
      if (!types.isAssignmentExpression(declaration) || !declaration.left?.property?.value || !declaration.right) continue;
      functionHolder[declaration.left.property.value] = declaration.right;
    }

    if (!functionHolder[callee.property?.value]) return;
    const replaceWithFunction = functionHolder[callee.property?.value];

    if (types.isFunctionExpression(replaceWithFunction)) {
      if (!types.isBlockStatement(replaceWithFunction.body) || replaceWithFunction.body.body.length !== 1 || !types.isReturnStatement(replaceWithFunction.body.body[0])) return;

      if (types.isBinaryExpression(replaceWithFunction.body.body[0].argument) && replaceWithFunction.params.length === 2 && replaceWithFunction.body.body[0].argument.left.name === replaceWithFunction.params[0].name && replaceWithFunction.body.body[0].argument.right.name === replaceWithFunction.params[1].name) {
        path.replaceWith(types.binaryExpression(replaceWithFunction.body.body[0].argument.operator, path.node.arguments[0], path.node.arguments[1]));
      } else if (types.isCallExpression(replaceWithFunction.body.body[0].argument)) {
        var callerName = replaceWithFunction.body.body[0].argument.callee.name;
        var inlineCallArguments = replaceWithFunction.body.body[0].argument.arguments.map(el => el.name);
        var replaceWithArguments = replaceWithFunction.params.map(el => el.name);

        if (replaceWithArguments[0] === callerName && replaceWithArguments.slice(1).equals(inlineCallArguments)) {
          path.replaceWith(types.callExpression(path.node.arguments[0], path.node.arguments.slice(1)));
        }
      }
    }
  }

});
traverse(ast, {
  MemberExpression(path) {
    const node = path.node;
    const prop = node.property;
    if (!node.computed || !types.isStringLiteral(prop)) return;

    if (prop.value.match(/^\d+$/)) {
      const newProp = parseInt(prop.value, 10);

      if (newProp.toString() === prop.value) {
        node.property = types.numericLiteral(newProp);
        node.computed = false;
      }

      path.replaceWith(node);
    } else if (types.isValidIdentifier(prop.value)) {
      node.property = types.identifier(prop.value);
      node.computed = false;
      path.replaceWithMultiple(node);
    }
  }

});
traverse(ast, {
  CallExpression(path) {
    if (!types.isMemberExpression(path.node.callee) || !types.isStringLiteral(path.node.callee.object) || path.node.callee.property.name !== "concat") return;

    if (!path.node.arguments.find(el => !types.isStringLiteral(el))) {
      var result = path.node.callee.object.value;

      for (let argument of path.node.arguments) {
        result += argument.value;
      }

      path.replaceWith(types.stringLiteral(result));
    }
  }

});
traverse(ast, {
  VariableDeclarator(path) {
    const init = path.node.init;
    if (!types.isObjectExpression(init)) return;
    if (init.properties.length === 0) return;
    const init_object = {};
    init.properties.forEach(t => init_object[t.key.name] = t.value);
    const binding = path.scope.getBinding(path.node.id.name);
    if (!binding?.constant) return;

    for (let referencePath of binding.referencePaths) {
      const parentParentNode = referencePath.parentPath.parentPath.node;
      if (types.isAssignmentExpression(parentParentNode) && types.isMemberExpression(parentParentNode.left) && parentParentNode.left.object.name == path.node.id.name) return;
      if (types.isUpdateExpression(parentParentNode)) return;
    }

    for (let referencePath of binding.referencePaths) {
      const parentParentNode = referencePath.parentPath.node;

      if (types.isMemberExpression(parentParentNode) && parentParentNode.object.name == path.node.id.name && types.isLiteral(init_object[parentParentNode.property.name])) {
        try {
          referencePath.parentPath.replaceWith(init_object[parentParentNode.property.name]);
        } catch (e) {}
      }
    }
  }

});

traverse(ast, {
  CallExpression(path) {
    //if (path.node.start !== 157665) return
    if (!types.isMemberExpression(path.node.callee) || !types.isMemberExpression(path.node.callee.object) || path.node.callee.property.name !== "split") return;
    if (path.node.arguments.length == 0 || !types.isStringLiteral(path.node.arguments[0]) || path.node.arguments[0].value !== "|") return;
    const object_binding = path.scope.getBinding(path.node.callee.object.object.name);
    if (!object_binding.path.isVariableDeclarator()) return;
    if (object_binding.path.node.init.properties.length > 0) return;
    const init_object = {};

    for (let referencePath of object_binding.referencePaths) {
      const parentParentNode = referencePath.parentPath.parentPath.node;
      if (!types.isAssignmentExpression(parentParentNode)) continue;
      if (!types.isMemberExpression(parentParentNode.left)) continue;
      if (!types.isLiteral(parentParentNode.right)) continue;
      init_object[parentParentNode.left.property.name] = parentParentNode.right;
    }

    if (init_object[path.node.callee.object.property.name]) path.node.callee.object = init_object[path.node.callee.object.property.name];
  }

});
traverse(ast, {
  ForStatement(path) {
    //if (path.node.start != 147921) return
    if (path.node.test || path.node.update) return;
    if (!types.isBlockStatement(path.node.body) || !types.isSwitchStatement(path.node.body.body[0])) return;
    const switchStatement = path.node.body.body[0];
    const discriminant = switchStatement.discriminant;
    if (!types.isMemberExpression(discriminant)) return;
    if (!types.isUpdateExpression(discriminant.property) || discriminant.property.operator !== "++") return;
    const jmp_variable_name = discriminant.object.name;
    const index_variable_name = discriminant.property.argument.name;
    const jmp_binding = path.scope.getBinding(jmp_variable_name);
    const jmp_binding_init = jmp_binding.path.node.init;
    const index_binding = path.scope.getBinding(index_variable_name);
    const index_binding_init = index_binding.path.node.init;
    if (!types.isCallExpression(jmp_binding_init) || !types.isNumericLiteral(index_binding_init) || index_binding_init.value != 0) return;
    if (!types.isStringLiteral(jmp_binding_init?.callee?.object)) return;
    const flattened_instructions = [];
    const execution_order = jmp_binding_init.callee.object.value.split("|");
    const cases = {};

    for (let switchCase of switchStatement.cases) {
      cases[switchCase.test.value] = switchCase.consequent;
    }

    for (let exec_id of execution_order) {
      cases[exec_id].forEach(t => {
        if (!types.isContinueStatement(t)) flattened_instructions.push(t);
      });
    }

    path.replaceWithMultiple(flattened_instructions);
  }

});
traverse(ast, {
  FunctionDeclaration(path) {
    if (!types.isBlockStatement(path.node.body)) return;
    const body = path.node.body;
    if (!types.isReturnStatement(body.body[body.body.length - 1])) return;
    const returnStatement = body.body[body.body.length - 1];
    if (!types.isCallExpression(returnStatement.argument)) return;
    const argument = returnStatement.argument;
    if (!types.isMemberExpression(argument.callee)) return;
    if (argument.callee.property.name !== "replace") return;
    if (argument.arguments.length !== 2) return;
    if (!types.isLiteral(argument.arguments[0])) return;
    if (!types.isFunctionExpression(argument.arguments[1])) return;
    if (argument.arguments[0].extra.raw !== "/[A-Za-z]/g") return;
    const binding = path.scope.getBinding(path.node.id.name);

    for (let referencePath of binding.referencePaths) {
      const parentPath = referencePath.parentPath;
      if (!parentPath.isCallExpression() || parentPath.node.arguments?.length != 1 || !types.isStringLiteral(parentPath.node.arguments[0])) continue;

      try {
        parentPath.replaceWith(types.valueToNode(utils.Tl(parentPath.node.arguments[0].value)));
      } catch (e) {}
    }
  }

});
traverse(ast, {
  FunctionDeclaration(path) {
    if (path.node.params.length !== 1) return;
    var body = path.node.body;
    if (!types.isBlockStatement(body)) return;
    body = body.body;
    if (body.length !== 3) return;
    if (!types.isVariableDeclaration(body[0]) || body[0].declarations.length !== 1 || !types.isCallExpression(body[0].declarations[0].init)) return;
    if (!types.isIfStatement(body[1]) || !types.isReturnStatement(body[2])) return;
    var ifStatement = body[1];
    if (!types.isMemberExpression(ifStatement.test)) return;
    if (!types.isExpressionStatement(ifStatement.consequent)) return;
    if (!types.isAssignmentExpression(ifStatement.consequent.expression)) return;
    traverse(ast, {
      CallExpression(path2) {
        path2.node.callee.name == path.node.id.name && types.isLiteral(path2.node.arguments[0]) && path2.replaceWith(types.valueToNode(utils.i(path2.node.arguments[0].value)));
      }

    });
  }

});

const result = generate(ast);
fs.writeFileSync("deobfuscated.js", result.code);
