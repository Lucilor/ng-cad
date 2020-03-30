import {Component, OnInit} from "@angular/core";
import {Store} from "@ngrx/store";
import {showHide} from "../animations";
import {getLoading} from "../store/selectors";
import {State} from "../store/state";

export const maxLoadingTime = 10000;

@Component({
	selector: "app-loading",
	templateUrl: "./loading.component.html",
	styleUrls: ["./loading.component.scss"],
	animations: [showHide]
})
export class LoadingComponent implements OnInit {
	visible: boolean;
	timeout: any;
	progress: number;

	constructor(private store: Store<State>) {
		this.store.select(getLoading).subscribe(loading => {
			this.visible = loading.list.size > 0;
			this.progress = loading.progress;
		});
	}

	ngOnInit() {}

	getScaleX() {
		return `scaleX(${this.progress})`;
	}
}
