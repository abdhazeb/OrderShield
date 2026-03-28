import { Component, ChangeDetectionStrategy, input, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBarComponent {
  placeholder = input<string>();
  showFilter = input(true);
  searchTerm = model('');
  search = output<string>();
  filterClick = output<void>();

  onSearch(): void {
    this.search.emit(this.searchTerm());
  }
}
