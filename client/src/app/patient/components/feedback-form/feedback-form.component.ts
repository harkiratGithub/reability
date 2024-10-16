import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FeedbackQuestion } from 'src/types';
// import { feedbackQuestions } from '../../utils/utils';
import { AjaxService } from 'src/app/therapist/services/ajax.service';

@Component({
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.scss'],
})
export class FeedbackFormComponent implements OnInit {
  questions: FeedbackQuestion[] = [];
  answers: { [key: string]: string | null } = {};
  hoverValues: { [key: number]: number | null } = {};
  constructor(public dialogRef: MatDialogRef<FeedbackFormComponent>, private ajax: AjaxService) {}

  ngOnInit(): void {
    this.loadFeedbackQuestions();
  }
  loadFeedbackQuestions(): void {
    this.ajax.getFeedbackQuestions().subscribe(
      (response: FeedbackQuestion[]) => {
        this.questions = this.getRandomQuestions(response, 5); 
        this.questions.forEach((q) => {
          this.answers[q.id] = null;
          this.hoverValues[q.id] = null;
        });
      },
      (error) => {
        console.error('Error fetching feedback questions', error);
      }
    );
  }
  

  getRandomQuestions(questions: FeedbackQuestion[], num: number): FeedbackQuestion[] {
    const shuffledQuestions = questions.map((q) => ({ ...q })).sort(() => 0.5 - Math.random());
    return shuffledQuestions.slice(0, num);
  }

  selectRating(questionId: number, value: string): void {
    this.answers[questionId] = value;
    this.hoverValues[questionId] = null;
  }

  submitFeedback(): void {
    const feedbackData = {
      questions: this.questions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        question_type: q.question_type,
        answer: this.answers[q.id] || 'skipped',
      })),
    };
    this.saveFeedback(feedbackData);
  }

  saveFeedback(feedbackData: any): void {
    this.ajax.updateGameFeedback(feedbackData).subscribe({
      next: (res) => {
        this.closeDialog();
      },
      error: (err) => {
        console.error('Error submitting feedback', err);
        this.closeDialog();
      }
    });
  }
  

  closeDialog(): void {
    this.dialogRef.close();
  }

  isFormValid(): boolean {
    return Object.values(this.answers).every((answer) => answer !== null);
  }
}
