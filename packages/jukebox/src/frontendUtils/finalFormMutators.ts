import { MutableState, Tools } from "final-form";

export default {
  setValue: <T>([name, value]: [string, unknown], state: MutableState<T>, {changeValue}: Tools<T>): void => {
    changeValue(state, name, () => value);
  },
  setUntouched: <T>([name]: [string], state: MutableState<T>, {}: Tools<T>): void => {
    state.fields[name] = {...state.fields[name], touched: false};
  },
};