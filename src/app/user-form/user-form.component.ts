import { Component, inject } from "@angular/core";
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from "@angular/forms";

import { UserService } from "../services/user.service";

@Component({
  selector: "app-user-form",
  standalone: true,
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: "./user-form.component.html",
  styleUrl: "./user-form.component.css"
})
export class UserFormComponent {

  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  userForm = this.fb.group({

    name: ["", Validators.required],

    email: ["",[ Validators.required, Validators.email ] ],

    password: [ "", Validators.required ],

    imageUrl: [""]

  });

  submit() {

    if (this.userForm.invalid) {

      this.userForm.markAllAsTouched();

      return;

    }

    const {
      name,
      email,
      password,
      imageUrl
    } = this.userForm.getRawValue();

    this.userService
      .createUser(
        name!,
        email!,
        password!,
        imageUrl || undefined
      )
      .subscribe({

        next: (result) => {

          console.log(
            "Utilisateur créé :",
            result.data
          );

          this.userForm.reset();

        },

        error: (error) => {

          console.error(
            "Erreur lors de la création :",
            error
          );

        }

      });

  }

}
