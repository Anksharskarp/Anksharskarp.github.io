// A small math grammar. Expressions never execute JavaScript or access objects.
const functions = Object.freeze({
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, log: Math.log, ln: Math.log,
  sqrt: Math.sqrt, abs: Math.abs,
});
const constants = Object.freeze({ pi: Math.PI, e: Math.E });

export function compileExpression(source, variables = ["t", "y", "a", "b", "c"]) {
  if (typeof source !== "string" || !source.trim()) throw new Error("Enter an equation.");
  if (source.length > 256) throw new Error("Keep each equation under 257 characters.");
  const tokens = [];
  const pattern = /\s*(?:(\d*\.\d+|\d+\.?\d*)([eE][+-]?\d+)?|([a-zA-Z]+)|([+\-*/^()]))/y;
  let position = 0;
  while (position < source.trimEnd().length) {
    pattern.lastIndex = position;
    const match = pattern.exec(source);
    if (!match) throw new Error(`Unexpected character at position ${position + 1}. Use * for multiplication.`);
    tokens.push(match[1] ? Number(match[1] + (match[2] || "")) : (match[3] || match[4]).toLowerCase());
    position = pattern.lastIndex;
  }
  if (tokens.length > 128) throw new Error("This equation has too many terms. Simplify it first.");
  let cursor = 0;
  const program = [];
  const precedence = { "+": 10, "-": 10, "*": 20, "/": 20, "^": 30 };
  function parse(minimum = 0) {
    const token = tokens[cursor++];
    if (typeof token === "number") {
      if (!Number.isFinite(token)) throw new Error("Numbers must be finite.");
      program.push(["number", token]);
    } else if (token === "+" || token === "-") {
      parse(25);
      if (token === "-") program.push(["function", (value) => -value]);
    } else if (token === "(") {
      parse();
      if (tokens[cursor++] !== ")") throw new Error("Close each opening parenthesis.");
    } else if (Object.hasOwn(functions, token)) {
      if (tokens[cursor++] !== "(") throw new Error(`Use ${token}(...) with parentheses.`);
      parse();
      if (tokens[cursor++] !== ")") throw new Error(`Close the parentheses after ${token}.`);
      program.push(["function", functions[token]]);
    } else if (Object.hasOwn(constants, token)) program.push(["number", constants[token]]);
    else if (variables.includes(token)) program.push(["variable", token]);
    else throw new Error(token === undefined ? "The equation is incomplete." : `Unknown term: ${token}. Use ${variables.join(", ")}.`);
    while (Object.hasOwn(precedence, tokens[cursor]) && precedence[tokens[cursor]] >= minimum) {
      const operator = tokens[cursor++];
      parse(precedence[operator] + (operator === "^" ? 0 : 1));
      program.push([operator]);
    }
  }
  parse();
  if (cursor !== tokens.length) throw new Error("Check parentheses and use * for multiplication, for example 2*y.");
  const stack = new Float64Array(program.length);
  return (values) => {
    let top = 0;
    for (const [operation, argument] of program) {
      if (operation === "number") stack[top++] = argument;
      else if (operation === "variable") stack[top++] = Object.hasOwn(values, argument) ? values[argument] : NaN;
      else if (operation === "function") stack[top - 1] = argument(stack[top - 1]);
      else {
        const right = stack[--top], left = stack[top - 1];
        stack[top - 1] = operation === "+" ? left + right : operation === "-" ? left - right : operation === "*" ? left * right : operation === "/" ? left / right : left ** right;
      }
      if (!Number.isFinite(stack[top - 1])) throw new Error("The equation is undefined or outside the real number range at this point.");
    }
    return stack[0];
  };
}
