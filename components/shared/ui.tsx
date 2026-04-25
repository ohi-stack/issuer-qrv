'use client';
import React from 'react';

export const Button = ({ className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button className={`btn ${className}`} {...p} />;
export const Card = ({ children }: { children: React.ReactNode }) => <section className="card">{children}</section>;
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...p} />;
export const Select = ({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="select" {...p}>{children}</select>;

export const DataTable = ({ columns, rows }: { columns: string[]; rows: React.ReactNode }) => (
  <table className="table"><thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows}</tbody></table>
);

export const EmptyState = ({ title, description }: { title: string; description?: string }) => <Card><strong>{title}</strong><p>{description || 'No data available.'}</p></Card>;
export const LoadingState = ({ title='Loading…' }: { title?: string }) => <Card><p>{title}</p></Card>;
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => <Card><p style={{color:'#dc2626'}}>{message}</p>{onRetry && <Button onClick={onRetry}>Retry</Button>}</Card>;
