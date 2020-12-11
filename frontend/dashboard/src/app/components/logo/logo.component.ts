import {Component, Input, OnInit} from '@angular/core';
import {LogoStyle} from './logo-style.interface';
import {environment as env} from 'src/environments/environment';

@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html'
})
export class LogoComponent implements OnInit {

  logoAlt: string;
  logoImage: string;
  // @ts-ignore
  style: LogoStyle;

  @Input('size')
  size: number;

  @Input('inverted')
  inverted: boolean = false;

  constructor() {
    this.logoAlt = '';
    this.size = 0;
    this.logoImage = '';
  }

  ngOnInit(): void {
    this.logoAlt = env.appName;
    this.logoImage = '../../assets/images/syscoin-sys.svg';
    this.style = {
      height: `${this.size > 5 ? 10 : 5}vh`
    };
  }
}
