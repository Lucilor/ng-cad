import {ActionTypes, LoadingAction} from "./actions";
import {State, initialState} from "./state";
import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "src/environments/environment";

export function loadingReducer(loading = initialState.loading, action: LoadingAction) {
	const newLoading = new Set(loading);
	if (action.type === ActionTypes.AddLoading) {
		newLoading.add(action.name);
	}
	if (action.type === ActionTypes.RemoveLoading) {
		newLoading.delete(action.name);
	}
	return newLoading;
}

export const reducers: ActionReducerMap<State> = {
	loading: loadingReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
