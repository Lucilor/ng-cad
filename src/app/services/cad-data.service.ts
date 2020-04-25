import {Injectable} from "@angular/core";
import {Store} from "@ngrx/store";
import {State} from "../store/state";
import {HttpClient} from "@angular/common/http";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {AlertComponent} from "../components/alert/alert.component";
import {ActivatedRoute} from "@angular/router";
import {LoadingAction, ActionTypes} from "../store/actions";
import {Response} from "../app.common";
import {CadData} from "../cad-viewer/cad-data";
import {CadViewer} from "../cad-viewer/cad-viewer";
import {SessionStorage} from "@lucilor/utils";

const session = new SessionStorage("cad-data");

@Injectable({
	providedIn: "root"
})
export class CadDataService {
	baseURL: string;
	encode: string;
	data: string;
	constructor(
		private store: Store<State>,
		private http: HttpClient,
		private dialog: MatDialog,
		private snackBar: MatSnackBar,
		route: ActivatedRoute
	) {
		this.baseURL = localStorage.getItem("baseURL");
		const params = route.snapshot.queryParams;
		this.encode = params.encode ? encodeURIComponent(params.encode) : "";
		this.data = params.encode ? encodeURIComponent(params.data) : "";
	}

	private alert(msg: any) {
		if (msg instanceof Error) {
			this.dialog.open(AlertComponent, {data: {title: "Oops!", content: msg.message}});
		} else if (msg) {
			this.dialog.open(AlertComponent, {data: {title: "Oops!", content: JSON.stringify(msg)}});
		}
	}

	async getCadData() {
		const {baseURL, encode, data} = this;
		if (!data) {
			return [new CadData(this.loadCurrentCad())];
		}
		this.store.dispatch<LoadingAction>({type: ActionTypes.AddLoading, name: "getCadData"});
		try {
			const response = await this.http.get<Response>(`${baseURL}/peijian/cad/getCad/${encode}?data=${data}`).toPromise();
			if (response.code === 0 && response.data) {
				if (!Array.isArray(response.data)) {
					response.data = [response.data];
				}
				const result: CadData[] = [];
				response.data.forEach((d) => {
					result.push(new CadData(d));
				});
				return result;
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return null;
		} finally {
			this.store.dispatch<LoadingAction>({type: ActionTypes.RemoveLoading, name: "getCadData"});
		}
	}

	saveCadStatus(cad: CadViewer, field: string) {
		const status = {id: cad.data.id, position: cad.position.toArray()};
		session.save(field, status);
		return status;
	}

	loadCadStatus(cad: CadViewer, field: string) {
		const status = session.load(field, true);
		if (status && status.id === cad.data.id) {
			if (Array.isArray(status.position)) {
				cad.position.set(status.position[0], status.position[1], status.position[2]);
			}
			return status;
		} else {
			return null;
		}
	}

	saveCurrentCad(data: CadData) {
		console.log(data.export());
		session.save("currentCad", data.export());
	}

	loadCurrentCad() {
		return session.load("currentCad", true);
	}
}
