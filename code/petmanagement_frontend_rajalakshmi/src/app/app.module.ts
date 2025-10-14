import { NgModule } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';

@NgModule({
  providers: [
    provideHttpClient(withFetch())  // Add this line
  ],
})
export class AppModule {}

