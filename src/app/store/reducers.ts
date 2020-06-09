import {LoadingAction, CurrCadsAction, CadStatusAction} from "./actions";
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
	const {type, cads} = action;
	if (type === "clear curr cads") {
		return {};
	} else if (type === "set curr cads") {
		return cads;
	} else if (type === "refresh curr cads") {
		return cloneDeep(currCads);
	}
	return currCads;
}

export function cadStatusReducer(cadStatus = initialState.cadStatus, action: CadStatusAction) {
	const {type} = action;
	if (type === "set cad status") {
		return action.cadStatus;
	} else if (type === "refresh cad status") {
		return cloneDeep(cadStatus);
	}
	return cadStatus;
}

export const reducers: ActionReducerMap<State> = {
	loading: loadingReducer,
	currCads: currCadsReducer,
	cadStatus: cadStatusReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
