export interface State {
	loading: {list: Set<string>; progress: number};
	currCads: Set<string>;
}

export const initialState: State = {
	loading: {list: new Set(), progress: -1},
	currCads: new Set()
};
