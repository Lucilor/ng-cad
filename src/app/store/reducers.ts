import {LoadingAction, CurrCadsAction} from "./actions";
import {State, initialState} from "./state";
import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "src/environments/environment";
import {cloneDeep} from "lodash";

export function loadingReducer(loading = initialState.loading, action: LoadingAction) {
	const newLoading: State["loading"] = cloneDeep(loading);
	if (action.type === "add loading") {
		newLoading.list.add(action.name);
	} else if (action.type === "remove loading") {
		newLoading.list.delete(action.name);
	} else if (action.type === "set loading progress") {
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

export function currCadsReducer(currCads = initialState.currCads, action: CurrCadsAction) {
	const cads = new Set(currCads);
	if (action.type === "add curr cad") {
		cads.add(action.cad);
	} else if (action.type === "remove curr cad") {
		cads.delete(action.cad);
	} else if (action.type === "clear curr cads") {
		cads.clear();
	}
	return cads;
}

export const reducers: ActionReducerMap<State> = {
	loading: loadingReducer,
	currCads: currCadsReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
