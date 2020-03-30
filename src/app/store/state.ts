export interface State {
	loading: {list: Set<string>; progress: number};
}

export const initialState: State = {
	loading: {list: new Set(), progress: -1}
};
