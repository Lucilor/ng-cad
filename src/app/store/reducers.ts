import {ActionTypes, LoadingAction} from "./actions";
import {State, initialState} from "./state";
import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "src/environments/environment";
import {cloneDeep} from "lodash";

export function loadingReducer(loading = initialState.loading, action: LoadingAction) {
	const newLoading: State["loading"] = cloneDeep(loading);
	if (action.type === ActionTypes.AddLoading) {
		newLoading.list.add(action.name);
	}
	if (action.type === ActionTypes.RemoveLoading) {
		newLoading.list.delete(action.name);
	}
	if (action.type === ActionTypes.setLoadingProgress) {
		const progress = action.progress;
		if (progress < 0 || progress > 1) {
			newLoading.list.delete(action.name);
			newLoading.progress = -1;
		} else {
			if (!newLoading.list.has(action.name)) {
				newLoading.list.add(action.name);
			}
			newLoading.progress = progress;
		}
	}
	return newLoading;
}

export const reducers: ActionReducerMap<State> = {
	loading: loadingReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
