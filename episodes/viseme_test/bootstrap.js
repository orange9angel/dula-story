import { registerAnimation } from "dula-engine";
import { registerAll } from "dula-assets";
import { TurnAround } from "./animations/TurnAround.js";

registerAll();
registerAnimation("TurnAround", TurnAround);
