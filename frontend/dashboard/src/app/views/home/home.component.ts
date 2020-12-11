import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ProposalService} from "../../services/proposal.service";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  loader: boolean;
  hashs: string[];

  constructor(
    private proposalService: ProposalService,
    private _snackBar: MatSnackBar
  ) {
    this.loader = true;
    this.hashs = [];
  }

  ngOnInit(): void {
    this.getProposalHashs();
  }

  getProposalHashs() {
    this.proposalService.getAll().subscribe((res: any) => {
      this.hashs = res[`hashs`];
      this.loader = false
    }, error => {
      this._snackBar.open(error.message, 'close', {
        duration: 2000,
      });
    })
  }

  proposalHashCreated(e: any) {
    this.loader = e;
    this.getProposalHashs();
  }

  updateListProposalHidden(e: any) {
    this.loader = e;
    this.getProposalHashs();
  }
}
