import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { StudentDiaryComponent } from './student-diary';

describe('StudentDiaryComponent', () => {
  let component: StudentDiaryComponent;
  let fixture: ComponentFixture<StudentDiaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentDiaryComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentDiaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
