import {Action} from "@ngrx/store";
import {CadData} from "../cad-viewer/cad-data/cad-data";

export type LoadingActionType = "add loading" | "remove loading" | "set loading progress";
export interface LoadingAction extends Action {
	readonly type: LoadingActionType;
	name: string;
	progress?: number;
}

export type CurrCadsActionType = "add curr cad" | "remove curr cad" | "clear curr cads";
export interface CurrCadsAction extends Action {
	readonly type: CurrCadsActionType;
	cad?: string;
}
