import { MutableState, Tools } from "final-form";

export default {
  setValue: <T>([name, value]: [string, unknown], state: MutableState<T>, {changeValue}: Tools<T>): void => {
    changeValue(state, name, () => value);
  },
};