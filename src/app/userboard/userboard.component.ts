import { Component,inject, OnInit,  } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthState } from '../auth-state';
import { User } from '../services/auth.service';

@Component({
  selector: 'app-userboard',
  standalone:true,
  imports: [RouterLink],
  templateUrl: './userboard.component.html',
  styleUrl: './userboard.component.css',
})
export class UserboardComponent {
     private authState = inject(AuthState);
    currentUser: User | null = null;
    private router = inject(Router);

  ngOnInit(): void {

    this.authState.init().subscribe(user => {
      if (!user) {
        this.router.navigate(['/home']);
      } else {
        this.currentUser = user;
      }
    });



  }
}
