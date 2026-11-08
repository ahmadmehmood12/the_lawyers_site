<?php

namespace Tests\Feature\Public;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ErrorPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_missing_page_shows_the_branded_404(): void
    {
        $this->get('/this-page-does-not-exist')
            ->assertNotFound()
            ->assertSee('Page not found')
            ->assertSee('Contact support');
    }

    public function test_inertia_visits_get_the_error_component_with_shared_props(): void
    {
        $lawyer = $this->lawyer();

        $this->actingAs($lawyer)->withHeaders(['X-Inertia' => 'true'])
            ->get('/cases/999999')
            ->assertNotFound()
            ->assertJsonPath('component', 'Errors/Show')
            ->assertJsonPath('props.status', 404)
            ->assertJsonPath('props.auth.user.id', $lawyer->id)
            ->assertJsonPath('props.app.name', 'WakeelDiary');
    }

    public function test_unknown_urls_on_inertia_visits_still_render_the_component(): void
    {
        $this->withHeaders(['X-Inertia' => 'true'])
            ->get('/this-page-does-not-exist')
            ->assertNotFound()
            ->assertJsonPath('component', 'Errors/Show')
            ->assertJsonPath('props.status', 404);
    }

    public function test_forbidden_pages_use_the_403_view(): void
    {
        $this->actingAs($this->lawyer())->get(route('admin.settings.edit'))
            ->assertForbidden()
            ->assertSee('Access denied');
    }
}
