export interface State {
	loading: {list: Set<string>; progress: number};
	currCads: {[key: string]: {self: boolean; full: boolean; partners: string[]; components: string[]}};
	cadStatus: {name: "normal" | "select line"; index: number; extra?: any};
}

export const initialState: State = {
	loading: {list: new Set(), progress: -1},
	currCads: {},
	cadStatus: {name: "normal", index: -1}
};
