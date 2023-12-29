class ZincDate {
  from(s: string): Date {
    const [day, month, year] = s.split("-");
    return new Date(`${year}-${month}-${day}`);
  }

  to(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString();
    return `${month}-${day}-${year}`;
  }
}

export { ZincDate };
