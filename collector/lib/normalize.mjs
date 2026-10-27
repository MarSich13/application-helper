const technologies = [
  ['java', /\bjava\b/i], ['c#', /\bc#(?=[\s,./;+)]|$)/i],
  ['typescript', /\btypescript\b/i], ['javascript', /\bjavascript\b/i],
  ['python', /\bpython\b/i], ['react', /\breact(?:\.js)?\b/i],
  ['angular', /\bangular\b/i], ['kotlin', /\bkotlin\b/i],
  ['.net', /\.net\b/i], ['spring boot', /\bspring\s*boot\b/i],
  ['spring', /\bspring\b/i], ['postgresql', /\bpostgres(?:ql)?\b/i],
  ['sql', /\bsql\b|\bpostgresql\b|\bmysql\b/i], ['oracle', /\boracle\b/i],
  ['node.js', /\bnode\.?js\b/i], ['go', /\bgolang\b|\bGo developer\b/],
  ['rust', /\brust\b/i], ['c++', /\bc\+\+/i],
  ['docker', /\bdocker\b/i], ['kubernetes', /\bkubernetes\b|\bk8s\b/i],
  ['aws', /\baws\b|amazon web services/i], ['azure', /\bazure\b/i],
];

export function workplace(description, structured = 'unknown') {
  const hybrid = /\bhybrid\b|hübriid|гибрид/i.test(description);
  const remote = /\bremote\b|kaugtöö|удал[её]н/i.test(description);
  const office = /office[- ]based|on[- ]site|onsite|kontoritöö/i.test(description);
  // A single enum cannot represent an explicit choice of arrangements.
  if ([hybrid, remote, office].filter(Boolean).length > 1) return 'UNSPECIFIED';
  if (hybrid) return 'HYBRID';
  // Avoid interpreting incidental mentions of remote systems as a work policy.
  if (remote && /remote work|work remotely|remote position|fully remote|kaugtöö|удал[её]нная работа/i.test(description)) return 'REMOTE';
  if (office) return 'ONSITE';
  return ({ hybrid: 'HYBRID', remote: 'REMOTE', 'on-site': 'ONSITE' })[structured] ?? 'UNSPECIFIED';
}

export function requiredUnsupportedLanguage(description, accepted = ['English', 'Estonian', 'Russian']) {
  const languages = ['English', 'Estonian', 'Russian', 'German', 'Finnish', 'Swedish', 'French', 'Spanish', 'Latvian', 'Lithuanian', 'Polish', 'Norwegian', 'Danish'];
  return languages.find(language => !accepted.some(value => value.toLowerCase() === language.toLowerCase()) && (
    new RegExp(`(?:fluent|fluency|proficiency)(?:\\s+in)?[a-z ,/()-]{0,45}\\b${language}\\b`, 'i').test(description)
    || new RegExp(`\\b${language}(?: language)? (?:is )?(?:required|mandatory|essential)\\b`, 'i').test(description)
  ));
}

export function normalize(job, acceptedLanguages) {
  const id = String(job?.id ?? '').trim();
  if (!/^\d+$/.test(id)) throw new Error('Missing or invalid LinkedIn job ID');
  const title = String(job.title ?? '').trim();
  const company = String(job.company ?? '').trim();
  const description = String(job.description ?? '').trim();
  if (!title || !company || !description || /^(unknown|unknown company|unknown title)$/i.test(company)) throw new Error('Incomplete job details');
  const location = String(job.location ?? '').trim();
  const tallinn = /\btallinn\b/i.test(location);
  const estoniaRemote = /\bestonia\b/i.test(location) && (job.workplaceType === 'remote' || /fully remote|remote work|work remotely/i.test(description));
  if (!tallinn && !estoniaRemote) throw new Error('Outside Tallinn and no Estonia-based remote arrangement');
  const unsupported = requiredUnsupportedLanguage(description, acceptedLanguages);
  if (unsupported) throw new Error(`Explicit required language outside profile: ${unsupported}`);
  if (/no longer accepting applications|this job is no longer available|position has been filled/i.test(description)) throw new Error('Posting explicitly closed');
  const text = `${title}\n${description}`;
  const warnings = [];
  if (description.length > 30000) warnings.push('Description truncated to API limit; full text is in raw.json');
  if (/volunteer/i.test(job.employmentType ?? '')) warnings.push('Public employment metadata says Volunteer; verify with employer');
  if (workplace(description, job.workplaceType) === 'UNSPECIFIED') warnings.push('Working arrangement unknown or multiple options; see description');
  const suppliedSeniority = job.seniorityLevel && !/not applicable/i.test(job.seniorityLevel) ? job.seniorityLevel : job.experienceLevel ?? '';
  const titleLevel = /\bjunior\b/i.test(title) ? 'Junior' : /\b(?:mid[- ]level|middle)\b/i.test(title) ? 'Middle' : /\bsenior\b/i.test(title) ? 'Senior' : '';
  const sourceLevel = /^entry[- ]level$/i.test(suppliedSeniority) ? 'Junior' : suppliedSeniority;
  const conflictingLevel = titleLevel && sourceLevel && !sourceLevel.toLowerCase().includes(titleLevel.toLowerCase());
  const seniority = conflictingLevel ? titleLevel : sourceLevel || titleLevel;
  if (conflictingLevel) warnings.push(`Conflicting seniority metadata (${suppliedSeniority}); explicit title level retained`);
  // Only inspect the requirements section: company age is not required experience.
  const requirements = description.search(/qualifications|who are we looking for|to thrive in this role|what we are looking for|required|requirements|see töö sobib/i);
  const years = requirements < 0 ? undefined : description.slice(requirements).match(/(?:at least\s+)?\d+(?:\s*[–-]\s*\d+)?\+?\s+years?\b|vähemalt\s+\d+\s+aastat/i)?.[0];
  return { item: {
    externalId: id,
    title: title.slice(0, 200), company: company.slice(0, 200), location: location.slice(0, 200),
    workMode: workplace(description, job.workplaceType),
    experience: [seniority, years].filter(Boolean).join(' · ').slice(0, 100),
    salary: String(job.salary ?? '').slice(0, 200), description: description.slice(0, 30000),
    sourceUrl: `https://www.linkedin.com/jobs/view/${id}`,
    technologies: technologies.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag).slice(0, 20),
  }, warnings };
}

export function batches(items, maxBytes = 1_500_000) {
  const result = [];
  let batch = [];
  for (const item of items) {
    if (Buffer.byteLength(JSON.stringify({ source: 'linkedin', vacancies: [item] })) > maxBytes) throw new Error('A vacancy exceeds the import byte limit');
    if (batch.length && (batch.length >= 100 || Buffer.byteLength(JSON.stringify({ source: 'linkedin', vacancies: [...batch, item] })) > maxBytes)) {
      result.push({ source: 'linkedin', vacancies: batch }); batch = [];
    }
    batch.push(item);
  }
  if (batch.length) result.push({ source: 'linkedin', vacancies: batch });
  return result;
}
