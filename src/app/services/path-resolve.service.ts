import {Injectable} from "@angular/core";
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Params} from "@angular/router";
import {paths} from "../app.common";

@Injectable({
	providedIn: "root"
})
export class PathResolveService implements Resolve<{path: string; queryParams: Params}> {
	constructor() {}
	resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
		const url = state.url.replace("/", "");
		let index = -1;
		for (let i = 0; i < url.length; i++) {
			if (["#", "?"].includes(url[i])) {
				index = i;
				break;
			}
		}
		const typoPath = url.slice(0, index);
		const threshold = this.getThreshold(typoPath);
		const dictionary = Object.values(paths).filter(path => Math.abs(path.length - typoPath.length) < threshold);

		if (!dictionary.length) {
			return null;
		}

		this.sortByDistances(typoPath, dictionary);

		return {path: `/${dictionary[0]}`, queryParams: route.queryParams};
	}

	getThreshold(path: string): number {
		if (path.length < 5) {
			return 3;
		}
		return 5;
	}

	sortByDistances(typoPath: string, dictionary: string[]) {
		const pathsDistance = {} as {[name: string]: number};

		dictionary.sort((a, b) => {
			if (!(a in pathsDistance)) {
				pathsDistance[a] = this.levenshtein(a, typoPath);
			}
			if (!(b in pathsDistance)) {
				pathsDistance[b] = this.levenshtein(b, typoPath);
			}

			return pathsDistance[a] - pathsDistance[b];
		});
	}

	levenshtein(a: string, b: string): number {
		if (a.length === 0) {
			return b.length;
		}
		if (b.length === 0) {
			return a.length;
		}

		const matrix = [];

		// increment along the first column of each row
		for (let i = 0; i <= b.length; i++) {
			matrix[i] = [i];
		}

		// increment each column in the first row
		for (let j = 0; j <= a.length; j++) {
			matrix[0][j] = j;
		}

		// Fill in the rest of the matrix
		for (let i = 1; i <= b.length; i++) {
			for (let j = 1; j <= a.length; j++) {
				if (b.charAt(i - 1) === a.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1, // substitution
						matrix[i][j - 1] + 1, // insertion
						matrix[i - 1][j] + 1 // deletion
					);
				}
			}
		}

		return matrix[b.length][a.length];
	}
}
