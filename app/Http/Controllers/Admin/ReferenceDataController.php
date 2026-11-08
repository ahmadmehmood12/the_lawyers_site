<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BarCouncil;
use App\Models\City;
use App\Models\Court;
use App\Models\CourtType;
use App\Models\District;
use App\Models\Judge;
use App\Models\Province;
use App\Models\Specialization;
use App\Support\ReferenceOptions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Schema-driven CRUD for administrable reference data (docs/Modules/Courts.md).
 * Each resource declares its model, fields and validation. Rows referenced
 * by legal records cannot be deleted (FK restrict) — deactivate instead.
 */
class ReferenceDataController extends Controller
{
    /**
     * @return array<string, array{model: class-string<Model>, label: string, fields: list<array<string, mixed>>, search: list<string>, with?: list<string>}>
     */
    private function resources(): array
    {
        $select = fn (array $options) => ['type' => 'select', 'options' => $options];

        return [
            'courts' => ['model' => Court::class, 'label' => 'Courts', 'search' => ['name', 'name_ur'], 'with' => ['courtType:id,name', 'district:id,name'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'name_ur', 'label' => 'Name (Urdu)', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'court_type_id', 'label' => 'Court type', ...$select(CourtType::query()->orderBy('sort_order')->get()->map(fn ($t) => ['value' => $t->id, 'label' => $t->name])->all()), 'rules' => ['required', 'exists:court_types,id'], 'display' => 'courtType.name'],
                ['name' => 'parent_id', 'label' => 'Principal seat (for benches)', ...$select(ReferenceOptions::courts()), 'rules' => ['nullable', 'exists:courts,id']],
                ['name' => 'district_id', 'label' => 'District', ...$select(ReferenceOptions::districts()), 'rules' => ['nullable', 'exists:districts,id'], 'display' => 'district.name'],
                ['name' => 'bench', 'label' => 'Bench / branch', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'address', 'label' => 'Address', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'phone', 'label' => 'Phone', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:30']],
                ['name' => 'is_active', 'label' => 'Active', 'type' => 'boolean', 'rules' => ['boolean']],
            ]],
            'judges' => ['model' => Judge::class, 'label' => 'Judges', 'search' => ['name'], 'with' => ['court:id,name'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'designation', 'label' => 'Designation', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'court_id', 'label' => 'Court', ...$select(ReferenceOptions::courts()), 'rules' => ['required', 'exists:courts,id'], 'display' => 'court.name'],
                ['name' => 'courtroom', 'label' => 'Courtroom', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:50']],
                ['name' => 'is_active', 'label' => 'Active', 'type' => 'boolean', 'rules' => ['boolean']],
            ]],
            'specializations' => ['model' => Specialization::class, 'label' => 'Specializations', 'search' => ['name', 'name_ur'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'name_ur', 'label' => 'Name (Urdu)', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'description', 'label' => 'Description', 'type' => 'textarea', 'rules' => ['nullable', 'string', 'max:2000']],
                ['name' => 'description_ur', 'label' => 'Description (Urdu)', 'type' => 'textarea', 'rules' => ['nullable', 'string', 'max:2000']],
                ['name' => 'sort_order', 'label' => 'Sort order', 'type' => 'number', 'rules' => ['nullable', 'integer', 'min:0']],
                ['name' => 'is_active', 'label' => 'Active', 'type' => 'boolean', 'rules' => ['boolean']],
            ]],
            'provinces' => ['model' => Province::class, 'label' => 'Provinces', 'search' => ['name'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'name_ur', 'label' => 'Name (Urdu)', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'code', 'label' => 'Code', 'type' => 'text', 'rules' => ['required', 'string', 'max:10'], 'unique' => true],
            ]],
            'districts' => ['model' => District::class, 'label' => 'Districts', 'search' => ['name'], 'with' => ['province:id,name'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'name_ur', 'label' => 'Name (Urdu)', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'province_id', 'label' => 'Province', ...$select(ReferenceOptions::provinces()), 'rules' => ['required', 'exists:provinces,id'], 'display' => 'province.name'],
            ]],
            'cities' => ['model' => City::class, 'label' => 'Cities', 'search' => ['name'], 'with' => ['district:id,name'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'name_ur', 'label' => 'Name (Urdu)', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'district_id', 'label' => 'District', ...$select(ReferenceOptions::districts()), 'rules' => ['required', 'exists:districts,id'], 'display' => 'district.name'],
            ]],
            'court-types' => ['model' => CourtType::class, 'label' => 'Court types', 'search' => ['name'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'name_ur', 'label' => 'Name (Urdu)', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'level', 'label' => 'Hierarchy level (1 = apex)', 'type' => 'number', 'rules' => ['required', 'integer', 'between:1,9']],
            ]],
            'bar-councils' => ['model' => BarCouncil::class, 'label' => 'Bar councils', 'search' => ['name'], 'fields' => [
                ['name' => 'name', 'label' => 'Name', 'type' => 'text', 'rules' => ['required', 'string', 'max:255']],
                ['name' => 'name_ur', 'label' => 'Name (Urdu)', 'type' => 'text', 'rules' => ['nullable', 'string', 'max:255']],
                ['name' => 'code', 'label' => 'Code', 'type' => 'text', 'rules' => ['required', 'string', 'max:20'], 'unique' => true],
            ]],
        ];
    }

    private function resource(string $key): array
    {
        return $this->resources()[$key] ?? abort(404);
    }

    public function index(Request $request, string $resource): Response
    {
        $def = $this->resource($resource);
        $model = $def['model'];

        $rows = $model::query()->with($def['with'] ?? [])
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where(fn ($w) => collect($def['search'])->each(fn ($col) => $w->orWhere($col, 'like', "%{$s}%"))))
            ->orderBy('name')->orderBy('id')->paginate(30)->withQueryString()
            ->through(fn (Model $m) => ['id' => $m->getKey(), ...collect($def['fields'])->mapWithKeys(fn ($f) => [$f['name'] => $m->getAttribute($f['name'])])->all(),
                '_display' => collect($def['fields'])->filter(fn ($f) => isset($f['display']))->mapWithKeys(fn ($f) => [$f['name'] => data_get($m, $f['display'])])->all()]);

        return Inertia::render('Admin/Reference', [
            'resource' => $resource,
            'resources' => collect($this->resources())->map(fn ($r, $k) => ['key' => $k, 'label' => __($r['label'])])->values(),
            'label' => __($def['label']),
            'fields' => collect($def['fields'])->map(fn ($f) => [...collect($f)->except(['rules', 'display', 'unique'])->all(), 'label' => __($f['label'])])->values(),
            'rows' => $rows,
            'filters' => $request->only('search'),
        ]);
    }

    public function store(Request $request, string $resource): RedirectResponse
    {
        $def = $this->resource($resource);
        $data = $request->validate($this->rules($def, $resource));
        $model = new $def['model'];
        $this->fill($model, $data)->save();
        ReferenceOptions::flush();

        return back()->with('success', __('Saved.'));
    }

    public function update(Request $request, string $resource, int $id): RedirectResponse
    {
        $def = $this->resource($resource);
        $model = $def['model']::query()->findOrFail($id);
        $data = $request->validate($this->rules($def, $resource, $id));
        $this->fill($model, $data)->save();
        ReferenceOptions::flush();

        return back()->with('success', __('Saved.'));
    }

    public function destroy(string $resource, int $id): RedirectResponse
    {
        $def = $this->resource($resource);

        try {
            $def['model']::query()->findOrFail($id)->delete();
        } catch (QueryException) {
            return back()->with('error', __('This record is in use and cannot be deleted. Deactivate it instead.'));
        }
        ReferenceOptions::flush();

        return back()->with('success', __('Deleted.'));
    }

    private function rules(array $def, string $resource, ?int $id = null): array
    {
        $table = (new $def['model'])->getTable();

        return collect($def['fields'])->mapWithKeys(fn ($f) => [$f['name'] => [...$f['rules'], ...(! empty($f['unique']) ? [Rule::unique($table, $f['name'])->ignore($id)] : [])]])->all();
    }

    private function fill(Model $model, array $data): Model
    {
        $model->forceFill($data);
        if (in_array('slug', $model->getFillable(), true) && $model->getAttribute('name') && (! $model->getAttribute('slug') || $model->isDirty('name'))) {
            $base = Str::slug($model->getAttribute('name'));
            $slug = $base;
            $i = 2;
            while ($model->newQuery()->where('slug', $slug)->whereKeyNot($model->getKey())->exists()) {
                $slug = $base.'-'.$i++;
            }
            $model->setAttribute('slug', $slug);
        }

        return $model;
    }
}
