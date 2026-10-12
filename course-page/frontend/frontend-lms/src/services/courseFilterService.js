export const SORT_BY_TITLE = 'title';
export const SORT_BY_PRICE = 'price';
export const SORT_BY_RATING = 'rating';
export const DEFAULT_PAGE_SIZE = 6;

const normalize = (text) => (text || '').toString().trim().toLowerCase();

export const filterByCategory = (courses, categoryId) => {
  if (categoryId === null || categoryId === undefined || categoryId === 'all') {
    return courses;
  }
  return courses.filter((course) => Number(course.category_id) === Number(categoryId));
};

export const filterBySearch = (courses, query) => {
  const term = normalize(query);
  if (term === '') {
    return courses;
  }
  return courses.filter((course) => {
    return normalize(course.title).includes(term) || normalize(course.description).includes(term);
  });
};

export const filterByPriceRange = (courses, minPrice, maxPrice) => {
  return courses.filter((course) => {
    const price = Number(course.price);
    if (Number.isNaN(price)) {
      return false;
    }
    if (minPrice !== undefined && minPrice !== null && price < minPrice) {
      return false;
    }
    if (maxPrice !== undefined && maxPrice !== null && price > maxPrice) {
      return false;
    }
    return true;
  });
};

export const sortCourses = (courses, criteria, descending = false) => {
  const sorted = [...courses];
  sorted.sort((a, b) => {
    switch (criteria) {
      case SORT_BY_TITLE:
        return normalize(a.title).localeCompare(normalize(b.title));
      case SORT_BY_PRICE:
        return Number(a.price) - Number(b.price);
      case SORT_BY_RATING:
        return Number(a.avg_rating || 0) - Number(b.avg_rating || 0);
      default:
        return 0;
    }
  });
  return descending ? sorted.reverse() : sorted;
};

export const paginate = (courses, page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: courses.slice(start, start + pageSize),
    page: current,
    totalPages,
    hasPrevious: current > 1,
    hasNext: current < totalPages,
  };
};

export const applyFilters = (courses, options = {}) => {
  const { categoryId, search, minPrice, maxPrice, sortBy, descending, page, pageSize } = options;
  let result = filterByCategory(courses, categoryId);
  result = filterBySearch(result, search);
  result = filterByPriceRange(result, minPrice, maxPrice);
  if (sortBy) {
    result = sortCourses(result, sortBy, descending);
  }
  return paginate(result, page, pageSize);
};

export default {
  filterByCategory,
  filterBySearch,
  filterByPriceRange,
  sortCourses,
  paginate,
  applyFilters,
};
