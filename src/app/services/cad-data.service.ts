import {Injectable} from "@angular/core";
import {Store} from "@ngrx/store";
import {State} from "../store/state";
import {HttpClient} from "@angular/common/http";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {AlertComponent} from "../components/alert/alert.component";
import {ActivatedRoute} from "@angular/router";

@Injectable({
	providedIn: "root"
})
export class CadDataService {
	baseURL: string;
	encode: string;
	constructor(
		private store: Store<State>,
		private http: HttpClient,
		private dialog: MatDialog,
		private snackBar: MatSnackBar,
		private route: ActivatedRoute
	) {
		this.baseURL = localStorage.getItem("baseURL");
		this.encode = encodeURIComponent(route.snapshot.params.encode);
	}

	private alert(msg: any) {
		if (msg instanceof Error) {
			this.dialog.open(AlertComponent, {data: {title: "Oops!", content: msg.message}});
		} else if (msg) {
			this.dialog.open(AlertComponent, {data: {title: "Oops!", content: JSON.stringify(msg)}});
		}
	}

	async getData() {}
}
