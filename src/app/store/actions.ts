import {Action} from "@ngrx/store";
import {State} from "./state";

export type LoadingActionType = "add loading" | "remove loading" | "set loading progress";
export interface LoadingAction extends Action {
	readonly type: LoadingActionType;
	name: string;
	progress?: number;
}

export type CurrCadsActionType = "clear curr cads" | "set curr cads" | "refresh curr cads";
export interface CurrCadsAction extends Action {
	readonly type: CurrCadsActionType;
	cads?: State["currCads"];
}

export type CadStatusActionType = "set cad status" | "refresh cad status";
export interface CadStatusAction extends Action {
	readonly type: CadStatusActionType;
	cadStatus?: State["cadStatus"];
}
