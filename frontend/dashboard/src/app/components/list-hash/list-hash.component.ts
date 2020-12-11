import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ProposalService} from "../../services/proposal.service";
import {MatSnackBar} from "@angular/material/snack-bar";

@Component({
  selector: 'app-list-hash',
  templateUrl: './list-hash.component.html',
})
export class ListHashComponent implements OnInit {

  @Input('hashs') hashs: any[];
  @Output() refreshList = new EventEmitter<Boolean>();

  constructor(
    private proposalService: ProposalService,
    private _snackBar: MatSnackBar
  ) {
    this.hashs = []
  }

  ngOnInit(): void {
  }

  destroyProposalHiddenHash(id: any) {
    this.proposalService.destroy(id).subscribe((res: any) => {
      this._snackBar.open(res.message, 'close', {
        duration: 2000,
      });
      this.refreshList.emit(true)
    }, ({error}) => {
      this._snackBar.open(error.message, 'close', {
        duration: 2000,
      });
    })
  }
}
