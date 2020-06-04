import {LoadingAction, CurrCadsAction} from "./actions";
import {State, initialState} from "./state";
import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "src/environments/environment";
import {cloneDeep} from "lodash";
import {CadData} from "../cad-viewer/cad-data/cad-data";

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
	let cads = new Set(currCads);
	const {type, id, ids} = action;
	if (type === "add curr cad") {
		cads.add(id);
	} else if (type === "remove curr cad") {
		cads.delete(id);
	} else if (type === "clear curr cads") {
		cads.clear()
	} else if (type === "set curr cads") {
		cads = new Set(ids)
	}
	return cads;
}

export const reducers: ActionReducerMap<State> = {
	loading: loadingReducer,
	currCads: currCadsReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
