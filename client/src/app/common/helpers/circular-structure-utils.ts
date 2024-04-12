export const getCurrentItemInCircularStructure = (array: any[], currentIndex: number): any => {
  if (!array || array.length === 0) {
    return null;
  }
  return array[currentIndex];
};

export const getPreviousItemInCircularStructure = (array: any[], currentIndex: number): any => {
  if (!array || array.length < 3) {
    return null;
  }
  if (currentIndex === 0) {
    return array[array.length - 1];
  }
  return array[currentIndex - 1];
};

export const getNextItemInCircularStructure = (array: any[], currentIndex: number): any => {
  if (!array || array.length < 2) {
    return null;
  }
  if (currentIndex === array.length - 1) {
    return array[0];
  }
  return array[currentIndex + 1];
};
