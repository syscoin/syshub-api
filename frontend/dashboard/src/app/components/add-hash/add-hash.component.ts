import {Component, OnInit, Output, EventEmitter} from '@angular/core';
import {AbstractControl, FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {ProposalService} from "../../services/proposal.service";
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-add-hash',
  templateUrl: './add-hash.component.html'
})
export class AddHashComponent implements OnInit {
  @Output() newHash = new EventEmitter<Boolean>();
  addForm: FormGroup;
  hashInput: AbstractControl;

  constructor(
    private f: FormBuilder,
    private proposalService: ProposalService,
    private _snackBar: MatSnackBar
  ) {
    this.addForm = this.f.group({
      hash: new FormControl('', [Validators.required, Validators.minLength(64)])
    })
    // @ts-ignore
    this.hashInput = this.addForm.get('hash');
  }

  ngOnInit(): void {

  }

  onSubmit() {
    this.proposalService.create(this.hashInput.value).subscribe((res: any) => {
      this._snackBar.open(res.message, 'close', {
        panelClass: ['red-snackbar'],
        duration: 2000,
      });
      this.addForm.patchValue({
        hash: ''
      })
      if (res.message !== 'Proposal already hidden') {
        this.newHash.emit(true)
      }
    }, ({error}) => {
      this._snackBar.open(error.message, 'close', {
        panelClass: ['red-snackbar'],
        duration: 2000,
      });
    })
  }

}
