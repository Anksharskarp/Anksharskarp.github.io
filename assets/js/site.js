import { initNavigation } from "./components/navigation.js";
import { initTerminal } from "./components/terminal.js";
initNavigation();
initTerminal();
// The model is optional and cannot interrupt navigation or access to content.
import("./components/logic-board.js")
  .then(({ initLogicBoard }) => initLogicBoard())
  .catch(() => {
    /* The labeled diagram remains available. */
  });
