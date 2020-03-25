export interface State {
	loading: Set<string>;
}

export const initialState: State = {
	loading: new Set()
};
