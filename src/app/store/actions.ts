import {Action} from "@ngrx/store";

export enum ActionTypes {
	AddLoading = "Add Loading",
	RemoveLoading = "Remove Loading",
}

export interface LoadingAction extends Action {
	readonly type: ActionTypes.AddLoading | ActionTypes.RemoveLoading;
	name: string;
}
